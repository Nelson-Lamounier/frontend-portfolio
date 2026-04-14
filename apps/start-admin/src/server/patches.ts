/**
 * Production HTTP server for TanStack Start (Admin).
 *
 * This file is the single source of truth for the production server wrapper.
 * It is compiled from `src/server/patches.ts` → `server.js` (project root) by
 * esbuild as part of the standard `yarn build` script:
 *
 *   esbuild src/server/patches.ts --bundle --platform=node --format=esm \
 *     --outfile=server.js '--external:./dist/*'
 *
 * Responsibilities:
 *   1. Fast-path static file serving: maps /admin/assets/* → dist/client/assets/*
 *      before any request reaches the SSR handler. TanStack Start's SSR fetch
 *      handler does not serve dist/client/ assets natively.
 *   2. SSR delegation: converts Node.js IncomingMessage → Web Request and
 *      pipes the Web Response back to the Node.js ServerResponse.
 *
 * Runtime import note:
 *   `serverExport` is loaded via a dynamic `createRequire` call so TypeScript
 *   does not attempt to resolve `./dist/server/server.js` at type-check time.
 *   The file is produced by `vite build` and only exists after a full build.
 *   esbuild marks the path as external (--external:./dist/*), so at runtime the
 *   Node.js ESM loader resolves it from the same directory as `server.js`.
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { createServer } from 'http';
import { createReadStream, statSync } from 'fs';
import { extname, join } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// SSR server export type
// ---------------------------------------------------------------------------
/**
 * Shape of the TanStack Start SSR server bundle produced by `vite build`.
 * The module exports a default object (or the object itself) that contains
 * a Web-standard `fetch` handler.
 */
interface SsrServerExport {
  /** Web-standard fetch handler. */
  fetch?: (request: Request) => Promise<Response>;
  /** Some adapters nest the export under `.default`. */
  default?: SsrServerExport;
}

// ---------------------------------------------------------------------------
// Load SSR handler at runtime (file only exists after `vite build`)
// ---------------------------------------------------------------------------
// We use `createRequire` so TypeScript does not try to resolve the path at
// type-check time. esbuild marks `./dist/*` as external, so Node's ESM
// resolver picks it up from the compiled server.js location at runtime.
const _require = createRequire(import.meta.url);
const serverExport = _require('./dist/server/server.js') as SsrServerExport;

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT) || 5001;

// ---------------------------------------------------------------------------
// Static asset config
// ---------------------------------------------------------------------------
// Vite outputs client assets to dist/client/. The app is built with
// ROUTER_BASEPATH="admin" so browsers request /admin/assets/<hash>.<ext>.
// We strip the basepath prefix and resolve against dist/client/.
const CLIENT_DIR = join(__dirname, 'dist', 'client');

/** MIME type map for static assets served from dist/client/. */
const MIME_TYPES: Record<string, string> = {
  '.js':    'application/javascript; charset=utf-8',
  '.mjs':   'application/javascript; charset=utf-8',
  '.css':   'text/css; charset=utf-8',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.webp':  'image/webp',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.json':  'application/json',
};

// ---------------------------------------------------------------------------
// Static file handler
// ---------------------------------------------------------------------------
/**
 * Attempts to serve a static file from `dist/client/`.
 *
 * URL mapping:
 *   /admin/assets/styles-BaHLhT7v.css  →  dist/client/assets/styles-BaHLhT7v.css
 *   /admin/assets/main-BPTnT1y8.js     →  dist/client/assets/main-BPTnT1y8.js
 *
 * @param urlPath - Pathname portion of the request URL (no query string).
 * @param res     - Node.js HTTP server response.
 * @returns `true` if the response was sent; `false` to fall through to SSR.
 */
function tryServeStatic(urlPath: string, res: ServerResponse): boolean {
  // Strip the "/admin" basepath prefix so we resolve relative to dist/client/.
  let stripped = urlPath.startsWith('/admin') ? urlPath.slice(6) : urlPath;

  // Decode percent-encoded characters (e.g. spaces, non-ASCII filenames).
  try {
    stripped = decodeURIComponent(stripped);
  } catch {
    // Malformed URI — fall through to SSR (which will 404 cleanly).
    return false;
  }

  // Guard against path-traversal: resolved path must remain inside CLIENT_DIR.
  const filePath = join(CLIENT_DIR, stripped);
  if (!filePath.startsWith(CLIENT_DIR)) return false;

  let stat: ReturnType<typeof statSync>;
  try {
    stat = statSync(filePath);
  } catch {
    return false; // file not found — fall through to SSR
  }
  if (!stat.isFile()) return false;

  // Vite content-hashes files in assets/, so they are safe to cache immutably.
  // Top-level files (favicon.ico, robots.txt) can mutate between deploys.
  const isImmutableAsset = stripped.startsWith('/assets/');
  const mime = MIME_TYPES[extname(filePath)] ?? 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type':   mime,
    'Content-Length': stat.size,
    'Cache-Control':  isImmutableAsset
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=3600',
  });
  createReadStream(filePath).pipe(res);
  return true;
}

// ---------------------------------------------------------------------------
// SSR handler (TanStack Start)
// ---------------------------------------------------------------------------
const serverHandler: SsrServerExport['fetch'] =
  serverExport.default?.fetch ?? serverExport.fetch;

if (!serverHandler) {
  console.error("Fatal: could not find 'fetch' handler in dist/server/server.js");
  process.exit(1);
}

/** Extended RequestInit that includes the `duplex` option required by Node 22. */
interface NodeRequestInit extends RequestInit {
  duplex?: 'half';
}

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const urlPath = req.url?.split('?')[0] ?? '/';

    // 1. Fast-path: serve Vite-built static assets directly from disk.
    //    Only GET/HEAD can produce a static file — everything else goes to SSR.
    if ((req.method === 'GET' || req.method === 'HEAD') && tryServeStatic(urlPath, res)) {
      return;
    }

    // 2. SSR: convert Node.js IncomingMessage → Web Request → delegate to TanStack Start.
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    const headers = new Headers();
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      headers.append(req.rawHeaders[i], req.rawHeaders[i + 1]);
    }

    const init: NodeRequestInit = {
      method:  req.method,
      headers,
      // Required for POST/PUT bodies in Node 22's native fetch compatibility layer.
      duplex: 'half',
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      init.body = Buffer.concat(chunks);
    }

    const webReq = new Request(url, init);
    const webRes = await serverHandler(webReq);

    res.statusCode = webRes.status;
    res.statusMessage = webRes.statusText;
    // Use appendHeader (not setHeader) to preserve multiple Set-Cookie values.
    webRes.headers.forEach((value: string, name: string) => res.appendHeader(name, value));

    // SSR HTML embeds hashed asset URLs — caching the HTML shell causes stale
    // asset references after deploys (browser requests old hash that no longer
    // exists). Force no-store on HTML responses so browsers always get fresh HTML.
    const contentType = res.getHeader('content-type');
    if (typeof contentType === 'string' && contentType.includes('text/html')) {
      res.setHeader('Cache-Control', 'no-store');
    }

    if (webRes.body) {
      const reader = webRes.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }

    res.end();
  } catch (error) {
    console.error('Server error:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

httpServer.listen(port, process.env.HOST ?? '0.0.0.0', () => {
  console.log(`🚀 Production server listening at http://${process.env.HOST ?? '0.0.0.0'}:${port}`);
});

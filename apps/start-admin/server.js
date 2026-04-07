import { createServer } from 'http';
import serverExport from './dist/server/server.js';

const port = process.env.PORT || 5001;

// The export structure might be nested or direct depending on Vite plugin version
const serverHandler = serverExport.default?.fetch || serverExport.fetch;

if (!serverHandler) {
  console.error("Failed to find 'fetch' handler in dist/server/server.js");
  process.exit(1);
}

const httpServer = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const method = req.method;
    
    // Convert Node.js req headers to Web Headers
    const headers = new Headers();
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      headers.append(req.rawHeaders[i], req.rawHeaders[i + 1]);
    }

    const init = {
      method,
      headers,
      // Node 22 native fetch compatibility
      duplex: 'half'
    };

    if (method !== 'GET' && method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      init.body = Buffer.concat(chunks);
    }

    const webReq = new Request(url, init);
    const webRes = await serverHandler(webReq);

    res.statusCode = webRes.status;
    res.statusMessage = webRes.statusText;
    webRes.headers.forEach((value, name) => res.setHeader(name, value));

    if (webRes.body) {
      const reader = webRes.body.getReader();
      while (true) {
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

httpServer.listen(port, process.env.HOST || '0.0.0.0', () => {
  console.log(`🚀 Production server listening at http://${process.env.HOST || '0.0.0.0'}:${port}`);
});

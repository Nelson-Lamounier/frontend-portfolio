export function GET(req) { return Response.json({ url: req.url, nextUrl: req.nextUrl.pathname }) }

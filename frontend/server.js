// Tiny static server for local / LAN use.
// Usage: node server.js [--port 8080] [--host 0.0.0.0]
import { createServer } from "http";
import { readFile, stat } from "fs/promises";
import { createReadStream } from "fs";
import { extname, join, normalize } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const argv = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = argv.indexOf(flag);
  return i !== -1 ? argv[i + 1] : def;
};

const PORT = parseInt(process.env.PORT || getArg("--port", "8080"), 10);
const HOST = process.env.HOST || getArg("--host", "127.0.0.1");

const root = join(__dirname, "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = decodeURIComponent(url.pathname);

    // Security: normalize and keep inside root.
    let filePath = normalize(join(root, pathname));
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    let stats;
    try {
      stats = await stat(filePath);
    } catch {
      /* not found yet */
    }

    if (stats && stats.isDirectory()) {
      // Directory: serve index.html if present.
      const indexPath = join(filePath, "index.html");
      try {
        await stat(indexPath);
        filePath = indexPath;
      } catch {
        // Basic listing
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        const rel = filePath.slice(root.length) || "/";
        res.end(`<h1>Index of ${rel}</h1>`);
        return;
      }
    }

    const ext = extname(filePath).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-cache",
    });
    createReadStream(filePath).pipe(res);
  } catch (err) {
    if (req.url === "/" || req.url.startsWith("/?")) {
      // SPA-ish: fallback to index.html
      try {
        const html = await readFile(join(root, "index.html"), "utf8");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      } catch {}
    }
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Tonika server running at http://${HOST}:${PORT}`);
});

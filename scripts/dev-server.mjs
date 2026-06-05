import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const port = Number(process.env.PORT || 4173);
const types = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};

http.createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
  if (request.method === "POST" && url.pathname === "/api/yellowscribe-code") {
    readRequestBody(request, 2_000_000)
      .then((body) => requestYellowScribeCode(body))
      .then((payload) => sendJson(response, 200, payload))
      .catch((error) => sendJson(response, error.statusCode || 502, { error: error.message || "No se pudo conectar con YellowScribe." }));
    return;
  }
  const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(root)) {
    response.writeHead(403);
    response.end("forbidden");
    return;
  }
  fs.readFile(file, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("not found");
      return;
    }
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
    });
    response.end(data);
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`ForgeList dev server listening on http://127.0.0.1:${port}/`);
});

function readRequestBody(request, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error("El roster es demasiado grande para subirlo."), { statusCode: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

async function requestYellowScribeCode(body) {
  const target = "https://yellowscribe.link/makeArmyAndReturnCode?filename=forgelist.ros&allocationMode=separateModels&uiHeight=700&uiWidth=1200&modules=MatchedPlay";
  const upstream = await fetch(target, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body,
  });
  const text = await upstream.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { err: text };
  }
  if (!upstream.ok || payload.err || !payload.code) {
    throw Object.assign(new Error(payload.err || "YellowScribe no devolvio un codigo."), { statusCode: upstream.status || 502 });
  }
  return { code: payload.code };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(payload));
}

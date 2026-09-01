import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFeltDB } from "@feltdb/core";

const root = path.dirname(fileURLToPath(import.meta.url));
const portArgument = process.argv.findIndex(
  (argument) => argument === "--port" || argument === "-p",
);
const port = Number(
  portArgument >= 0 ? process.argv[portArgument + 1] : process.env.PORT || 8080,
);
const namespace = process.env.FELTDB_NAMESPACE || "{{APP_NAMESPACE}}";
const db = createFeltDB({
  namespace,
  path: process.env.FELTDB_DATA_PATH || path.join(root, ".feltdb", "data"),
});

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length
    ? JSON.parse(Buffer.concat(chunks).toString("utf8"))
    : {};
}

async function handleFeltDB(request, response, pathname) {
  if (pathname === "/health") {
    sendJson(response, 200, { status: "ready", runtime: "node", namespace });
    return;
  }
  if (pathname === "/transactions" && request.method === "POST") {
    sendJson(response, 200, await db.transaction(await readJson(request)));
    return;
  }

  const match = pathname.match(
    /^\/collections\/([^/]+)(?:\/([^/]+))?(?:\/(cas))?$/,
  );
  if (!match) {
    sendJson(response, 404, { code: "NOT_FOUND" });
    return;
  }

  const collection = db.collection(decodeURIComponent(match[1]));
  const id = match[2] ? decodeURIComponent(match[2]) : undefined;
  try {
    if (request.method === "GET" && !id) {
      sendJson(
        response,
        200,
        (await collection.all()).map((value) => ({ value })),
      );
    } else if (request.method === "GET" && id) {
      const value = await collection.get(id);
      if (value) sendJson(response, 200, { value });
      else sendJson(response, 404, { code: "NOT_FOUND" });
    } else if (request.method === "POST" && !id) {
      const value = await readJson(request);
      if (value.id === undefined) throw new Error("Record id is required");
      const insertedId = await collection.insert(value, String(value.id));
      sendJson(response, 201, { id: insertedId, value });
    } else if (request.method === "PATCH" && id) {
      await collection.update(id, await readJson(request));
      sendJson(response, 200, { value: await collection.get(id) });
    } else if (request.method === "POST" && id && match[3] === "cas") {
      const body = await readJson(request);
      const result = await collection.updateIfVersion(
        id,
        body.expectedVersion,
        body.value,
      );
      sendJson(response, result.updated ? 200 : 409, result);
    } else if (request.method === "DELETE" && id) {
      await collection.delete(id);
      response.writeHead(204).end();
    } else {
      sendJson(response, 405, { code: "METHOD_NOT_ALLOWED" });
    }
  } catch (error) {
    sendJson(response, 400, { code: "FELTDB_ERROR", message: String(error) });
  }
}

let vite;
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import("vite");
  vite = await createViteServer({
    root,
    server: { middlewareMode: true },
    appType: "spa",
  });
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  if (url.pathname.startsWith("/api/feltdb")) {
    await handleFeltDB(
      request,
      response,
      url.pathname.slice("/api/feltdb".length) || "/",
    );
    return;
  }
  if (vite) {
    vite.middlewares(request, response, () =>
      sendJson(response, 404, { code: "NOT_FOUND" }),
    );
    return;
  }

  const dist = path.resolve(root, "dist");
  const relative = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const candidate = path.resolve(dist, relative);
  const safeCandidate = candidate.startsWith(`${dist}${path.sep}`)
    ? candidate
    : path.join(dist, "index.html");
  const file = await stat(safeCandidate)
    .then(() => safeCandidate)
    .catch(() => path.join(dist, "index.html"));
  const contentTypes = {
    ".css": "text/css",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript",
    ".json": "application/json",
    ".svg": "image/svg+xml",
  };
  response.setHeader(
    "content-type",
    contentTypes[path.extname(file)] || "application/octet-stream",
  );
  createReadStream(file).pipe(response);
});

const host =
  process.env.HOST ||
  (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
server.listen(port, host, () => {
  console.log(`FeltDB application running at http://localhost:${port}`);
});

async function shutdown() {
  await vite?.close();
  await db.close();
  server.close(() => process.exit(0));
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

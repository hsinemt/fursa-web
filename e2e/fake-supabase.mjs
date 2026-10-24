// A tiny fake Supabase for the end-to-end tests (see playwright.config.ts). Not used anywhere else.
// The password "right-password" signs in; any other password is refused.
import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 54399);
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const user = {
  id: "user-1",
  aud: "authenticated",
  role: "authenticated",
  email: "demo@example.com",
  app_metadata: {},
  user_metadata: { locale: "en" },
  created_at: "2026-01-01T00:00:00Z",
};

let counter = 0;
function makeSession(refresh) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    email: user.email,
    aud: "authenticated",
    role: "authenticated",
    iat: now,
    exp: now + 3600,
    session_id: "s1",
    jti: String(++counter),
  };
  return {
    access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.c2ln`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: refresh,
    user,
  };
}

const fail = (status, code) => ({ status, body: { code: status, error_code: code, msg: code } });

createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const url = new URL(req.url ?? "/", "http://fake");
    const raw = Buffer.concat(chunks).toString("utf8");
    const body = raw ? JSON.parse(raw) : {};
    const route = `${req.method} ${url.pathname}`;
    const grant = url.searchParams.get("grant_type");
    let out = fail(404, "not_found");

    if (route === "POST /auth/v1/token" && grant === "password") {
      out =
        body.password === "right-password"
          ? { status: 200, body: makeSession("refresh-1") }
          : fail(400, "invalid_credentials");
    } else if (route === "POST /auth/v1/token" && grant === "pkce") {
      out = { status: 200, body: makeSession("refresh-1") };
    } else if (route === "POST /auth/v1/token" && grant === "refresh_token") {
      out = { status: 200, body: makeSession("refresh-2") };
    } else if (route === "POST /auth/v1/signup") {
      out = { status: 200, body: user };
    } else if (route === "POST /auth/v1/recover") {
      out = { status: 200, body: {} };
    } else if (route === "GET /auth/v1/user" || route === "PUT /auth/v1/user") {
      out = { status: 200, body: user };
    } else if (route === "POST /auth/v1/logout") {
      out = { status: 204 };
    }
    res.writeHead(out.status, { "content-type": "application/json" });
    res.end(out.body === undefined ? undefined : JSON.stringify(out.body));
  });
}).listen(PORT, "127.0.0.1", () => console.log(`fake supabase on ${PORT}`));

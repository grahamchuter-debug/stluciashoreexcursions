export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export function corsHeaders(env: { CORS_ALLOWED_ORIGINS?: string }, request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.CORS_ALLOWED_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allow = allowed.includes(origin) ? origin : allowed[0] || "*";
  return {
    "access-control-allow-origin": allow,
    "access-control-allow-headers": "content-type,idempotency-key,x-st-lucia-operator-token",
    "access-control-allow-methods": "POST,GET,OPTIONS",
    "access-control-allow-private-network": "true",
  };
}

export function withCors(response: Response, env: { CORS_ALLOWED_ORIGINS?: string }, request: Request): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(env, request))) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}

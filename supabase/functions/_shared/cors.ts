// HTTP helpers shared by the Edge Functions: CORS headers, JSON responses,
// preflight / method guard and bearer token extraction.
// No remote imports here, so handlers stay testable offline.

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

/**
 * Handles the CORS preflight and rejects anything that is not POST.
 * Returns a Response to send immediately, or null when the request may proceed.
 */
export function guardPost(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }
  return null;
}

/** Extracts the JWT from `Authorization: Bearer <jwt>`; null when absent or malformed. */
export function bearerToken(req: Request): string | null {
  const header = req.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match ? match[1] : null;
}

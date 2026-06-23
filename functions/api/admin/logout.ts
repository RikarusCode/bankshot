import { clearSessionCookie, jsonResponse } from "../../_shared/archive";

export async function onRequestPost(): Promise<Response> {
  return jsonResponse(
    { ok: true },
    {
      headers: {
        "Set-Cookie": clearSessionCookie()
      }
    }
  );
}

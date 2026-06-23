import { createSessionCookie, jsonResponse, type FunctionEnv } from "../../_shared/archive";

type Context = {
  request: Request;
  env: FunctionEnv;
};

export async function onRequestPost({ request, env }: Context): Promise<Response> {
  if (!env.BANKSHOT_ADMIN_PASSWORD) {
    return jsonResponse({ error: "BANKSHOT_ADMIN_PASSWORD is not configured." }, { status: 500 });
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return jsonResponse({ error: "Request body must be JSON." }, { status: 400 });
  }

  if (password !== env.BANKSHOT_ADMIN_PASSWORD) {
    return jsonResponse({ error: "Password was not accepted." }, { status: 401 });
  }

  const cookie = await createSessionCookie(env);
  return jsonResponse(
    { ok: true },
    {
      headers: {
        "Set-Cookie": cookie
      }
    }
  );
}

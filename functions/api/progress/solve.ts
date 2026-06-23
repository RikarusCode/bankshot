import { buildServerProgress, getOrCreateDevice, recordSolve, withDeviceCookie, type DeviceEnv, type SolveInput } from "../../_shared/device";
import { jsonResponse } from "../../_shared/archive";

type Context = {
  request: Request;
  env: DeviceEnv;
};

function readSolveInput(value: unknown): SolveInput | undefined {
  if (!value || typeof value !== "object") return undefined;
  const data = value as Partial<SolveInput>;
  if (typeof data.date !== "string") return undefined;
  if (typeof data.puzzleId !== "string") return undefined;
  if (typeof data.attempts !== "number") return undefined;
  if (data.puzzleNumber !== undefined && typeof data.puzzleNumber !== "number") return undefined;
  return {
    date: data.date,
    puzzleId: data.puzzleId,
    puzzleNumber: data.puzzleNumber,
    attempts: data.attempts
  };
}

export async function onRequestPost({ request, env }: Context): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be JSON." }, { status: 400 });
  }

  const input = readSolveInput(body);
  if (!input) return jsonResponse({ error: "Solve payload is invalid." }, { status: 400 });

  const session = await getOrCreateDevice(request, env);
  if (session instanceof Response) return session;

  const solveError = await recordSolve(env, session.deviceId, input);
  if (solveError) return solveError;

  const progress = await buildServerProgress(env, session.deviceId);
  return withDeviceCookie(jsonResponse(progress), session);
}

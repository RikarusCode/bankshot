import { buildServerProgress, getOrCreateDevice, withDeviceCookie, type DeviceEnv } from "../../_shared/device";
import { jsonResponse } from "../../_shared/archive";

type Context = {
  request: Request;
  env: DeviceEnv;
};

export async function onRequestGet({ request, env }: Context): Promise<Response> {
  const session = await getOrCreateDevice(request, env);
  if (session instanceof Response) return session;

  const progress = await buildServerProgress(env, session.deviceId);
  return withDeviceCookie(jsonResponse(progress), session);
}

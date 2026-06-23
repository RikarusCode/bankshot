import { jsonResponse, publicArchive, type FunctionEnv } from "../_shared/archive";

type Context = {
  env: FunctionEnv;
};

export async function onRequestGet({ env }: Context): Promise<Response> {
  return jsonResponse(await publicArchive(env));
}

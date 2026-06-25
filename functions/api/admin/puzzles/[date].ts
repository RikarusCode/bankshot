import { deleteRecord, jsonResponse, loadRecord, requireAdmin, saveRecord, type FunctionEnv } from "../../../_shared/archive";
import type { PuzzleConfig } from "../../../../src/game/types";

type Context = {
  request: Request;
  env: FunctionEnv;
  params: {
    date: string;
  };
};

export async function onRequestPost({ request, env, params }: Context): Promise<Response> {
  const authError = await requireAdmin(request, env);
  if (authError) return authError;

  let puzzle: PuzzleConfig | undefined;
  try {
    const body = (await request.json()) as { puzzle?: PuzzleConfig };
    puzzle = body.puzzle;
  } catch {
    return jsonResponse({ error: "Request body must be JSON." }, { status: 400 });
  }

  if (!puzzle) return jsonResponse({ error: "Request must include a puzzle object." }, { status: 400 });

  try {
    await saveRecord(env, params.date, puzzle);
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Could not save puzzle." }, { status: 400 });
  }
}

export async function onRequestGet({ request, env, params }: Context): Promise<Response> {
  const authError = await requireAdmin(request, env);
  if (authError) return authError;

  const record = await loadRecord(env, params.date);
  if (!record) return jsonResponse({ error: "Puzzle not found." }, { status: 404 });
  return jsonResponse({ date: params.date, puzzle: record.puzzle });
}

export async function onRequestDelete({ request, env, params }: Context): Promise<Response> {
  const authError = await requireAdmin(request, env);
  if (authError) return authError;

  try {
    await deleteRecord(env, params.date);
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Could not delete puzzle." }, { status: 400 });
  }
}

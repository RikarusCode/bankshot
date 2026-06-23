import { getToday, jsonResponse, loadRecord, type FunctionEnv } from "../../_shared/archive";

type Context = {
  env: FunctionEnv;
  params: {
    date: string;
  };
};

export async function onRequestGet({ env, params }: Context): Promise<Response> {
  const date = params.date;
  if (date > getToday(env)) return jsonResponse({ error: "That puzzle is locked until its daily date." }, { status: 403 });

  const record = await loadRecord(env, date);
  if (!record) return jsonResponse({ error: "Puzzle not found." }, { status: 404 });
  return jsonResponse({ date, puzzle: record.puzzle });
}

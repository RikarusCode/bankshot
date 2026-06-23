import { jsonResponse, loadRecord, publicArchive, type FunctionEnv } from "../_shared/archive";

type Context = {
  env: FunctionEnv;
};

export async function onRequestGet({ env }: Context): Promise<Response> {
  const archive = await publicArchive(env);
  const entry = archive.entries.find((item) => item.date === archive.today);
  if (!entry) return jsonResponse({ error: "No daily puzzle scheduled." }, { status: 404 });
  if (entry.status !== "available") return jsonResponse({ error: "Today's puzzle is not available yet." }, { status: 404 });

  const record = await loadRecord(env, archive.today);
  if (!record) return jsonResponse({ error: "Today's puzzle is missing." }, { status: 404 });
  return jsonResponse({ date: archive.today, puzzle: record.puzzle });
}

// Shared global leaderboard, backed by a single Supabase table.
// The publishable key is safe to ship in the client: row-level security
// only permits reading the board and inserting sane score rows.

const REST_URL = 'https://uosnpylugkbnlegufygv.supabase.co/rest/v1/livewire_scores';
const PUBLISHABLE_KEY = 'sb_publishable_XW8bbmDJiVj-rRVQ9GXsig_K-ixvXjm';
// Legacy anon key (same project, same permissions) as a fallback in case a
// client rejects the modern key format.
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvc25weWx1Z2tibmxlZ3VmeWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTMxMjMsImV4cCI6MjA5ODEyOTEyM30.wdbiKOD1bmH-jSBtmYBFpvT_jZtZsAjF5oOrcifFGzo';

export interface ScoreRow {
  initials: string;
  score: number;
  circuit: number;
}

async function withKeyFallback(run: (key: string) => Promise<Response>): Promise<Response> {
  const res = await run(PUBLISHABLE_KEY);
  if (res.status !== 401 && res.status !== 403) return res;
  return run(ANON_KEY);
}

export async function fetchTopScores(limit = 10): Promise<ScoreRow[]> {
  const res = await withKeyFallback((key) =>
    fetch(`${REST_URL}?select=initials,score,circuit&order=score.desc&limit=${limit}`, {
      headers: { apikey: key },
    }),
  );
  if (!res.ok) throw new Error(`leaderboard fetch failed: ${res.status}`);
  return res.json();
}

export function cleanInitials(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
}

export async function submitScore(
  initials: string,
  score: number,
  circuit: number,
): Promise<void> {
  const clean = cleanInitials(initials) || 'ZAP';
  const res = await withKeyFallback((key) =>
    fetch(REST_URL, {
      method: 'POST',
      headers: {
        apikey: key,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        initials: clean,
        score: Math.max(1, Math.round(score)),
        circuit: Math.max(1, Math.round(circuit)),
      }),
    }),
  );
  if (!res.ok) throw new Error(`score submit failed: ${res.status}`);
}

const BASE_URL = 'https://v3.football.api-sports.io';

export async function fetchWorldCupFixtures() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) throw new Error('Missing API_FOOTBALL_KEY.');
  const league = process.env.API_FOOTBALL_LEAGUE_ID || '1';
  const season = process.env.API_FOOTBALL_SEASON || '2026';
  const params = new URLSearchParams({ league, season });
  const response = await fetch(`${BASE_URL}/fixtures?${params}`, {
    headers: { 'x-apisports-key': apiKey },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => null);
  return {
    ok: response.ok,
    status: response.status,
    quotaRemaining: response.headers.get('x-ratelimit-requests-remaining'),
    quotaUsed: response.headers.get('x-ratelimit-requests-limit'),
    payload,
  };
}

function outcome(homeGoals, awayGoals) {
  if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) return null;
  if (homeGoals > awayGoals) return 'home';
  if (awayGoals > homeGoals) return 'away';
  return 'draw';
}

export function normalizeFixtures(payload) {
  const rows = payload?.response ?? [];
  return rows.map((item) => {
    const status = item.fixture?.status?.short;
    const homeGoals = item.goals?.home;
    const awayGoals = item.goals?.away;
    const finalStatuses = new Set(['FT', 'AET', 'PEN']);
    return {
      id: String(item.fixture.id),
      provider: 'api-football',
      competition: item.league?.name || 'FIFA World Cup 2026',
      group_code: item.league?.round || null,
      home_team: item.teams?.home?.name,
      away_team: item.teams?.away?.name,
      kickoff: item.fixture?.date,
      venue: item.fixture?.venue?.name || null,
      status: finalStatuses.has(status) ? 'final' : new Date(item.fixture?.date) <= new Date() ? 'live_or_closed' : 'scheduled',
      home_goals: Number.isFinite(homeGoals) ? homeGoals : null,
      away_goals: Number.isFinite(awayGoals) ? awayGoals : null,
      outcome: outcome(homeGoals, awayGoals),
      raw: item,
      updated_at: new Date().toISOString(),
    };
  }).filter((row) => row.id && row.home_team && row.away_team && row.kickoff);
}

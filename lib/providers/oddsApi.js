const BASE_URL = 'https://api.the-odds-api.com/v4';

export async function fetchWorldCupOdds() {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) throw new Error('Missing ODDS_API_KEY.');
  const sport = process.env.ODDS_API_SPORT_KEY || 'soccer_fifa_world_cup';
  const params = new URLSearchParams({
    apiKey,
    regions: process.env.ODDS_API_REGIONS || 'us,uk,eu',
    markets: process.env.ODDS_API_MARKETS || 'h2h',
    oddsFormat: 'decimal',
    dateFormat: 'iso',
  });
  const response = await fetch(`${BASE_URL}/sports/${sport}/odds?${params}`, { cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  return {
    ok: response.ok,
    status: response.status,
    quotaRemaining: response.headers.get('x-requests-remaining'),
    quotaUsed: response.headers.get('x-requests-used'),
    payload,
  };
}

function outcomePrice(bookmaker, teamName) {
  const h2h = bookmaker.markets?.find((market) => market.key === 'h2h');
  return h2h?.outcomes?.find((outcome) => outcome.name === teamName)?.price ?? null;
}

export function normalizeOddsEvents(events = []) {
  return events.map((event) => {
    const snapshots = event.bookmakers?.map((bookmaker) => ({
      bookmaker: bookmaker.title || bookmaker.key,
      home_odds: outcomePrice(bookmaker, event.home_team),
      draw_odds: outcomePrice(bookmaker, 'Draw'),
      away_odds: outcomePrice(bookmaker, event.away_team),
      payload: bookmaker,
    })).filter((row) => row.home_odds && row.draw_odds && row.away_odds) ?? [];
    const best = snapshots.reduce((acc, row) => ({
      home: Math.max(acc.home, Number(row.home_odds)),
      draw: Math.max(acc.draw, Number(row.draw_odds)),
      away: Math.max(acc.away, Number(row.away_odds)),
    }), { home: 0, draw: 0, away: 0 });
    return {
      market: {
        id: `odds-${event.id}`,
        fixture_id: event.id,
        home_team: event.home_team,
        away_team: event.away_team,
        kickoff: event.commence_time,
        status: new Date(event.commence_time) <= new Date() ? 'closed' : 'open',
        best_home_odds: best.home || null,
        best_draw_odds: best.draw || null,
        best_away_odds: best.away || null,
        bookmaker_count: snapshots.length,
        source: 'the-odds-api',
        stale_after: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      snapshots: snapshots.map((snapshot) => ({ ...snapshot, market_id: `odds-${event.id}`, provider_event_id: event.id })),
    };
  });
}

export const FALLBACK_MARKETS = [
  {
    id: 'demo-wc-2026-usa-eng',
    home_team: 'USA',
    away_team: 'England',
    kickoff: '2026-06-12T20:00:00Z',
    status: 'open',
    bookmaker_count: 8,
    best_home_odds: 4.4,
    best_draw_odds: 3.65,
    best_away_odds: 1.86,
  },
  {
    id: 'demo-wc-2026-bra-ger',
    home_team: 'Brazil',
    away_team: 'Germany',
    kickoff: '2026-06-13T23:00:00Z',
    status: 'open',
    bookmaker_count: 10,
    best_home_odds: 2.34,
    best_draw_odds: 3.35,
    best_away_odds: 3.1,
  },
  {
    id: 'demo-wc-2026-arg-fra',
    home_team: 'Argentina',
    away_team: 'France',
    kickoff: '2026-06-14T18:00:00Z',
    status: 'open',
    bookmaker_count: 9,
    best_home_odds: 2.72,
    best_draw_odds: 3.2,
    best_away_odds: 2.62,
  },
];

export function fallbackChecks() {
  return [
    {
      id: 'demo-runtime',
      provider: 'puntlite',
      endpoint: 'fallback',
      ok: true,
      message: 'Demo markets loaded. Add Supabase and provider keys to switch on live sync.',
      checked_at: new Date().toISOString(),
    },
  ];
}

export function fallbackMarketById(id) {
  return FALLBACK_MARKETS.find((market) => market.id === id);
}

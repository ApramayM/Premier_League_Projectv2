export const FALLBACK_MARKETS = [
  {
    id: 'demo-wc-2026-france-senegal',
    home_team: 'France',
    away_team: 'Senegal',
    kickoff: '2026-06-16T19:00:00Z',
    status: 'open',
    bookmaker_count: 11,
    best_home_odds: 1.68,
    best_draw_odds: 3.55,
    best_away_odds: 5.6,
  },
  {
    id: 'demo-wc-2026-iraq-norway',
    home_team: 'Iraq',
    away_team: 'Norway',
    kickoff: '2026-06-16T22:00:00Z',
    status: 'open',
    bookmaker_count: 9,
    best_home_odds: 12.0,
    best_draw_odds: 5.75,
    best_away_odds: 1.25,
  },
  {
    id: 'demo-wc-2026-argentina-algeria',
    home_team: 'Argentina',
    away_team: 'Algeria',
    kickoff: '2026-06-17T01:00:00Z',
    status: 'open',
    bookmaker_count: 9,
    best_home_odds: 1.3,
    best_draw_odds: 5.4,
    best_away_odds: 9.75,
  },
  {
    id: 'demo-wc-2026-austria-jordan',
    home_team: 'Austria',
    away_team: 'Jordan',
    kickoff: '2026-06-17T04:00:00Z',
    status: 'open',
    bookmaker_count: 7,
    best_home_odds: 1.48,
    best_draw_odds: 4.25,
    best_away_odds: 7.6,
  },
];

export function fallbackChecks() {
  return [
    {
      id: 'demo-runtime',
      provider: 'puntlite',
      endpoint: 'fallback',
      ok: true,
      message: 'Today\'s World Cup slate loaded. Add Supabase and provider keys to switch on live sync.',
      checked_at: new Date().toISOString(),
    },
  ];
}

export function fallbackMarketById(id) {
  return FALLBACK_MARKETS.find((market) => market.id === id);
}

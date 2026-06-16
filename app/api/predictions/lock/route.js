import { NextResponse } from 'next/server';
import { fallbackMarketById } from '../../../../lib/fallback/markets';
import { hasSupabaseConfig, supabaseAdmin } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

function oddsForPick(market, pick) {
  if (pick === 'home') return market.best_home_odds;
  if (pick === 'draw') return market.best_draw_odds;
  if (pick === 'away') return market.best_away_odds;
  return null;
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { profileId, marketId, pick } = body;
  const stake = Number(body.stake || 1);
  if (!profileId || !marketId || !['home', 'draw', 'away'].includes(pick)) return NextResponse.json({ error: 'Missing profile, market, or pick.' }, { status: 400 });
  if (!Number.isFinite(stake) || stake <= 0) return NextResponse.json({ error: 'Stake must be greater than zero.' }, { status: 400 });
  if (!hasSupabaseConfig()) {
    if (stake > 10) return NextResponse.json({ error: 'Stake cannot exceed 10% of balance (10.00).' }, { status: 409 });
    const market = fallbackMarketById(marketId);
    if (!market || market.status !== 'open') return NextResponse.json({ error: 'Market is not open.' }, { status: 409 });
    const lockedOdds = Number(oddsForPick(market, pick));
    if (!lockedOdds) return NextResponse.json({ error: 'Odds are unavailable for this pick.' }, { status: 409 });
    return NextResponse.json(
      {
        prediction: {
          id: `local-prediction-${Date.now()}`,
          profile_id: profileId,
          market_id: marketId,
          markets: { home_team: market.home_team, away_team: market.away_team, kickoff: market.kickoff },
          pick,
          stake,
          locked_odds: lockedOdds,
          status: 'locked',
          locked_at: new Date().toISOString(),
          local: true,
        },
        balance: Number((100 - stake).toFixed(2)),
        local: true,
      },
      { status: 201 }
    );
  }
  const supabase = supabaseAdmin();
  const [{ data: profile }, { data: market }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', profileId).single(),
    supabase.from('markets').select('*').eq('id', marketId).single(),
  ]);
  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  if (!market || market.status !== 'open') return NextResponse.json({ error: 'Market is not open.' }, { status: 409 });
  if (new Date(market.kickoff) <= new Date()) return NextResponse.json({ error: 'Kickoff has passed.' }, { status: 409 });
  const maxStake = Math.max(0.01, Number((Number(profile.balance) * 0.1).toFixed(2)));
  if (stake > maxStake) return NextResponse.json({ error: `Stake cannot exceed 10% of balance (${maxStake.toFixed(2)}).` }, { status: 409 });
  if (Number(profile.balance) < stake) return NextResponse.json({ error: 'Insufficient balance.' }, { status: 409 });
  const lockedOdds = Number(oddsForPick(market, pick));
  if (!lockedOdds) return NextResponse.json({ error: 'Odds are unavailable for this pick.' }, { status: 409 });
  const { data: prediction, error } = await supabase.from('predictions').insert({ profile_id: profileId, market_id: marketId, pick, stake, locked_odds: lockedOdds }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const newBalance = Number((Number(profile.balance) - stake).toFixed(2));
  await supabase.from('profiles').update({ balance: newBalance }).eq('id', profileId);
  return NextResponse.json({ prediction, balance: newBalance }, { status: 201 });
}

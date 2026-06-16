import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/server';

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
  if (!Number.isFinite(stake) || stake <= 0 || stake > 25) return NextResponse.json({ error: 'Stake must be between 1 and 25.' }, { status: 400 });
  const supabase = supabaseAdmin();
  const [{ data: profile }, { data: market }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', profileId).single(),
    supabase.from('markets').select('*').eq('id', marketId).single(),
  ]);
  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  if (!market || market.status !== 'open') return NextResponse.json({ error: 'Market is not open.' }, { status: 409 });
  if (new Date(market.kickoff) <= new Date()) return NextResponse.json({ error: 'Kickoff has passed.' }, { status: 409 });
  if (Number(profile.balance) < stake) return NextResponse.json({ error: 'Insufficient balance.' }, { status: 409 });
  const lockedOdds = Number(oddsForPick(market, pick));
  if (!lockedOdds) return NextResponse.json({ error: 'Odds are unavailable for this pick.' }, { status: 409 });
  const { data: prediction, error } = await supabase.from('predictions').insert({ profile_id: profileId, market_id: marketId, pick, stake, locked_odds: lockedOdds }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const newBalance = Number((Number(profile.balance) - stake).toFixed(2));
  await supabase.from('profiles').update({ balance: newBalance }).eq('id', profileId);
  return NextResponse.json({ prediction, balance: newBalance }, { status: 201 });
}

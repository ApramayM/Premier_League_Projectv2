import { NextResponse } from 'next/server';
import { requireCronSecret } from '../../../../lib/auth/cron';
import { fetchWorldCupFixtures, normalizeFixtures } from '../../../../lib/providers/apiFootball';
import { fetchWorldCupOdds, normalizeOddsEvents } from '../../../../lib/providers/oddsApi';
import { supabaseAdmin } from '../../../../lib/supabase/server';

function sameMatch(fixture, market) {
  const teamsMatch = fixture.home_team === market.home_team && fixture.away_team === market.away_team;
  if (!teamsMatch) return false;
  const fixtureTime = new Date(fixture.kickoff).getTime();
  const marketTime = new Date(market.kickoff).getTime();
  return Math.abs(fixtureTime - marketTime) < 12 * 60 * 60 * 1000;
}

async function syncFixtures(supabase) {
  const result = await fetchWorldCupFixtures();
  const fixtures = result.ok ? normalizeFixtures(result.payload) : [];
  if (fixtures.length) {
    const { error } = await supabase.from('fixtures').upsert(fixtures, { onConflict: 'id' });
    if (error) throw error;
  }
  await supabase.from('provider_checks').insert({
    provider: 'api-football',
    endpoint: 'fixtures',
    ok: result.ok,
    status_code: result.status,
    message: result.ok ? `Synced ${fixtures.length} fixtures.` : JSON.stringify(result.payload).slice(0, 500),
    quota_remaining: result.quotaRemaining,
    quota_used: result.quotaUsed,
  });
  return { ok: result.ok, synced: fixtures.length };
}

async function syncOdds(supabase) {
  const result = await fetchWorldCupOdds();
  const events = result.ok ? normalizeOddsEvents(result.payload) : [];
  if (events.length) {
    const markets = events.map((event) => event.market);
    const snapshots = events.flatMap((event) => event.snapshots);
    const { error: marketError } = await supabase.from('markets').upsert(markets, { onConflict: 'id' });
    if (marketError) throw marketError;
    if (snapshots.length) {
      const { error: snapshotError } = await supabase.from('odds_snapshots').insert(snapshots);
      if (snapshotError) throw snapshotError;
    }
  }
  await supabase.from('provider_checks').insert({
    provider: 'the-odds-api',
    endpoint: 'odds',
    ok: result.ok,
    status_code: result.status,
    message: result.ok ? `Synced ${events.length} odds events.` : JSON.stringify(result.payload).slice(0, 500),
    quota_remaining: result.quotaRemaining,
    quota_used: result.quotaUsed,
  });
  return { ok: result.ok, synced: events.length };
}

async function settlePredictions(supabase) {
  const { data: finals, error: finalError } = await supabase.from('fixtures').select('*').eq('status', 'final').not('outcome', 'is', null);
  if (finalError) throw finalError;
  const { data: markets, error: marketError } = await supabase.from('markets').select('*').neq('status', 'settled');
  if (marketError) throw marketError;
  let settled = 0;
  for (const fixture of finals ?? []) {
    const market = (markets ?? []).find((item) => item.fixture_id === fixture.id || sameMatch(fixture, item));
    if (!market) continue;
    const { data: predictions } = await supabase.from('predictions').select('*').eq('market_id', market.id).eq('status', 'locked');
    for (const prediction of predictions ?? []) {
      const won = prediction.pick === fixture.outcome;
      const returnValue = won ? Number((Number(prediction.stake) * Number(prediction.locked_odds)).toFixed(2)) : 0;
      await supabase.from('predictions').update({ status: won ? 'won' : 'lost', return_value: returnValue, settled_at: new Date().toISOString() }).eq('id', prediction.id);
      if (returnValue > 0) {
        const { data: profile } = await supabase.from('profiles').select('balance').eq('id', prediction.profile_id).single();
        await supabase.from('profiles').update({ balance: Number((Number(profile.balance) + returnValue).toFixed(2)) }).eq('id', prediction.profile_id);
      }
      settled += 1;
    }
    await supabase.from('markets').update({ status: 'settled', fixture_id: fixture.id }).eq('id', market.id);
  }
  await supabase.from('provider_checks').insert({ provider: 'puntlite', endpoint: 'settle', ok: true, message: `Settled ${settled} predictions.` });
  return { settled };
}

export async function GET(request) {
  const denied = requireCronSecret(request);
  if (denied) return denied;
  const supabase = supabaseAdmin();
  const fixtures = await syncFixtures(supabase);
  const odds = await syncOdds(supabase);
  const settlement = await settlePredictions(supabase);
  return NextResponse.json({ ok: true, fixtures, odds, settlement, timestamp: new Date().toISOString() });
}

import { NextResponse } from 'next/server';
import { requireCronSecret } from '../../../../lib/auth/cron';
import { fetchWorldCupOdds, normalizeOddsEvents } from '../../../../lib/providers/oddsApi';
import { hasSupabaseConfig, supabaseAdmin } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const denied = requireCronSecret(request);
  if (denied) return denied;
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: 'Supabase environment variables are not configured.' }, { status: 503 });
  }
  const supabase = supabaseAdmin();
  const result = await fetchWorldCupOdds();
  const events = result.ok ? normalizeOddsEvents(result.payload) : [];
  if (events.length) {
    const markets = events.map((event) => event.market);
    const snapshots = events.flatMap((event) => event.snapshots);
    const { error: marketError } = await supabase.from('markets').upsert(markets, { onConflict: 'id' });
    if (marketError) return NextResponse.json({ error: marketError.message }, { status: 500 });
    if (snapshots.length) {
      const { error: snapshotError } = await supabase.from('odds_snapshots').insert(snapshots);
      if (snapshotError) return NextResponse.json({ error: snapshotError.message }, { status: 500 });
    }
  }
  await supabase.from('provider_checks').insert({ provider: 'the-odds-api', endpoint: 'odds', ok: result.ok, status_code: result.status, message: result.ok ? `Synced ${events.length} odds events.` : JSON.stringify(result.payload).slice(0, 500), quota_remaining: result.quotaRemaining, quota_used: result.quotaUsed });
  return NextResponse.json({ ok: result.ok, synced: events.length });
}

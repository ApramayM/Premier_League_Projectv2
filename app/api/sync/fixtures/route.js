import { NextResponse } from 'next/server';
import { requireCronSecret } from '../../../../lib/auth/cron';
import { fetchWorldCupFixtures, normalizeFixtures } from '../../../../lib/providers/apiFootball';
import { supabaseAdmin } from '../../../../lib/supabase/server';

export async function GET(request) {
  const denied = requireCronSecret(request);
  if (denied) return denied;
  const supabase = supabaseAdmin();
  const result = await fetchWorldCupFixtures();
  const fixtures = result.ok ? normalizeFixtures(result.payload) : [];
  if (fixtures.length) {
    const { error } = await supabase.from('fixtures').upsert(fixtures, { onConflict: 'id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await supabase.from('provider_checks').insert({ provider: 'api-football', endpoint: 'fixtures', ok: result.ok, status_code: result.status, message: result.ok ? `Synced ${fixtures.length} fixtures.` : JSON.stringify(result.payload).slice(0, 500), quota_remaining: result.quotaRemaining, quota_used: result.quotaUsed });
  return NextResponse.json({ ok: result.ok, synced: fixtures.length });
}

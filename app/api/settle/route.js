import { NextResponse } from 'next/server';
import { requireCronSecret } from '../../../lib/auth/cron';
import { supabaseAdmin } from '../../../lib/supabase/server';

export async function GET(request) {
  const denied = requireCronSecret(request);
  if (denied) return denied;
  const supabase = supabaseAdmin();
  const { data: finals, error: finalError } = await supabase.from('fixtures').select('*').eq('status', 'final').not('outcome', 'is', null);
  if (finalError) return NextResponse.json({ error: finalError.message }, { status: 500 });
  let settled = 0;
  for (const fixture of finals ?? []) {
    const { data: market } = await supabase.from('markets').select('*').eq('fixture_id', fixture.id).maybeSingle();
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
    await supabase.from('markets').update({ status: 'settled' }).eq('id', market.id);
  }
  await supabase.from('provider_checks').insert({ provider: 'puntlite', endpoint: 'settle', ok: true, message: `Settled ${settled} predictions.` });
  return NextResponse.json({ ok: true, settled });
}

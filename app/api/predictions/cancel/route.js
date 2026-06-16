import { NextResponse } from 'next/server';
import { hasSupabaseConfig, supabaseAdmin } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { profileId, predictionId } = body;
  if (!profileId || !predictionId) return NextResponse.json({ error: 'Missing profile or prediction.' }, { status: 400 });
  if (!hasSupabaseConfig()) return NextResponse.json({ ok: true, local: true });
  const supabase = supabaseAdmin();
  const { data: prediction, error: predictionError } = await supabase
    .from('predictions')
    .select('*, markets(status, kickoff)')
    .eq('id', predictionId)
    .eq('profile_id', profileId)
    .single();
  if (predictionError || !prediction) return NextResponse.json({ error: 'Prediction not found.' }, { status: 404 });
  if (prediction.status !== 'locked') return NextResponse.json({ error: 'Only locked predictions can be cancelled.' }, { status: 409 });
  if (prediction.markets?.status === 'settled') return NextResponse.json({ error: 'Settled markets cannot be cancelled.' }, { status: 409 });
  if (prediction.markets?.kickoff && new Date(prediction.markets.kickoff) <= new Date()) return NextResponse.json({ error: 'Kickoff has passed.' }, { status: 409 });
  const { data: profile } = await supabase.from('profiles').select('balance').eq('id', profileId).single();
  const newBalance = Number((Number(profile?.balance || 0) + Number(prediction.stake)).toFixed(2));
  const [{ error: updateError }] = await Promise.all([
    supabase.from('predictions').update({ status: 'void', return_value: Number(prediction.stake), settled_at: new Date().toISOString() }).eq('id', predictionId),
    supabase.from('profiles').update({ balance: newBalance }).eq('id', profileId),
  ]);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ ok: true, balance: newBalance });
}

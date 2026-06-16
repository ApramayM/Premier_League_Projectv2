import { NextResponse } from 'next/server';
import { hasSupabaseConfig, supabaseAdmin } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const profileId = new URL(request.url).searchParams.get('profileId');
  if (!profileId) return NextResponse.json({ predictions: [], balance: 100 });
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ predictions: [], balance: 100, local: true });
  }
  const supabase = supabaseAdmin();
  const [{ data: profile }, { data: predictions, error }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', profileId).single(),
    supabase.from('predictions').select('*, markets(home_team, away_team, kickoff)').eq('profile_id', profileId).order('locked_at', { ascending: false }).limit(100),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ balance: profile?.balance ?? 100, predictions: predictions ?? [] });
}

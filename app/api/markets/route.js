import { NextResponse } from 'next/server';
import { FALLBACK_MARKETS } from '../../../lib/fallback/markets';
import { hasSupabaseConfig, supabaseAdmin } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({
      markets: FALLBACK_MARKETS,
      demo: true,
    });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from('markets').select('*').order('kickoff', { ascending: true }).limit(40);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ markets: data ?? [] });
}

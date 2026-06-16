import { NextResponse } from 'next/server';
import { hasSupabaseConfig, supabaseAdmin } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({
      markets: [],
      warning: 'Supabase environment variables are not configured.',
    });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from('markets').select('*').order('kickoff', { ascending: true }).limit(40);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ markets: data ?? [] });
}

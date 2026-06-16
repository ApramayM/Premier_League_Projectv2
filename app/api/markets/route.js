import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from('markets').select('*').order('kickoff', { ascending: true }).limit(40);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ markets: data ?? [] });
}

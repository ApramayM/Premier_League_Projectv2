import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';

export async function GET() {
  const supabase = supabaseAdmin();
  const { data } = await supabase.from('provider_checks').select('*').order('checked_at', { ascending: false }).limit(6);
  return NextResponse.json({ ok: true, mode: 'world-cup-live', timestamp: new Date().toISOString(), checks: data ?? [] });
}

import { NextResponse } from 'next/server';
import { hasSupabaseConfig, supabaseAdmin } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({
      ok: true,
      mode: 'world-cup-live',
      timestamp: new Date().toISOString(),
      checks: [],
      warning: 'Supabase environment variables are not configured.',
    });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from('provider_checks').select('*').order('checked_at', { ascending: false }).limit(6);
  if (error) {
    return NextResponse.json({
      ok: true,
      mode: 'world-cup-live',
      timestamp: new Date().toISOString(),
      checks: [],
      warning: error.message,
    });
  }
  return NextResponse.json({ ok: true, mode: 'world-cup-live', timestamp: new Date().toISOString(), checks: data ?? [] });
}

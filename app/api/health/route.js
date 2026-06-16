import { NextResponse } from 'next/server';
import { fallbackChecks } from '../../../lib/fallback/markets';
import { hasSupabaseConfig, supabaseAdmin } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({
      ok: true,
      mode: 'demo-fallback',
      timestamp: new Date().toISOString(),
      checks: fallbackChecks(),
      demo: true,
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

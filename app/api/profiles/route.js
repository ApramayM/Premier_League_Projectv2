import { NextResponse } from 'next/server';
import { hasSupabaseConfig, supabaseAdmin } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

function makeAccessCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export async function GET(request) {
  const accessCode = new URL(request.url).searchParams.get('accessCode')?.trim();
  if (!accessCode) return NextResponse.json({ error: 'Enter an access code.' }, { status: 400 });
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ profile: { id: accessCode, display_name: 'Demo Player', balance: 100, access_code: accessCode, local: true } });
  }
  const supabase = supabaseAdmin();
  let profile = null;
  let error = null;
  const byCode = await supabase.from('profiles').select('*').eq('access_code', accessCode).maybeSingle();
  profile = byCode.data;
  error = byCode.error;
  if (!profile && /^[0-9a-f-]{36}$/i.test(accessCode)) {
    const byId = await supabase.from('profiles').select('*').eq('id', accessCode).maybeSingle();
    profile = byId.data;
    error = byId.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!profile) return NextResponse.json({ error: 'Portfolio not found.' }, { status: 404 });
  return NextResponse.json({ profile: { ...profile, access_code: profile.access_code || profile.id } });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const displayName = String(body.displayName || 'Guest').trim().slice(0, 40) || 'Guest';
  const accessCode = makeAccessCode();
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ profile: { id: accessCode, display_name: displayName, balance: 100, access_code: accessCode, local: true } }, { status: 201 });
  }
  const supabase = supabaseAdmin();
  let { data, error } = await supabase.from('profiles').insert({ display_name: displayName, access_code: accessCode }).select('*').single();
  if (error?.message?.includes('access_code')) {
    const fallback = await supabase.from('profiles').insert({ display_name: displayName }).select('*').single();
    data = fallback.data;
    error = fallback.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: { ...data, access_code: data.access_code || data.id } }, { status: 201 });
}

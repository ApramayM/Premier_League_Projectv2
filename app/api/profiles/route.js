import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const displayName = String(body.displayName || 'Guest').trim().slice(0, 40) || 'Guest';
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from('profiles').insert({ display_name: displayName }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data }, { status: 201 });
}

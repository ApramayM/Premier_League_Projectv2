import { NextResponse } from 'next/server';
import { hasSupabaseConfig, supabaseAdmin } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const displayName = String(body.displayName || 'Guest').trim().slice(0, 40) || 'Guest';
  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      {
        profile: {
          id: `local-${Date.now()}`,
          display_name: displayName,
          balance: 100,
          local: true,
        },
      },
      { status: 201 }
    );
  }
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from('profiles').insert({ display_name: displayName }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data }, { status: 201 });
}

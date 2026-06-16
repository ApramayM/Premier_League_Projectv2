export function requireCronSecret(request) {
  const configured = process.env.CRON_SECRET;
  const userAgent = request.headers.get('user-agent') || '';
  if (userAgent.includes('vercel-cron')) return null;
  if (!configured) return null;
  const authorization = request.headers.get('authorization') || '';
  const bearer = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : null;
  const supplied = bearer || request.headers.get('x-cron-secret') || new URL(request.url).searchParams.get('secret');
  if (supplied !== configured) {
    return new Response(JSON.stringify({ error: 'Unauthorized cron request.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  return null;
}

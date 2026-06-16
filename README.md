# PuntLite World Cup Live

World Cup prediction app for friends. It uses Vercel, Supabase, The Odds API, and API-Football.

## What is included

- Next.js app for Vercel.
- Guest profiles with a $100 play balance.
- Live market reads from Supabase.
- Odds sync from The Odds API.
- Fixture/result sync from API-Football.
- Prediction lock endpoint that freezes displayed odds.
- Settlement endpoint that grades predictions from final fixture outcomes.
- Provider health checks visible in the app.

## Supabase setup

1. Create or open your Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Copy your Project URL, anon key, and service role key.

## Vercel environment variables

Add these in Vercel Project Settings > Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ODDS_API_KEY=...
ODDS_API_SPORT_KEY=soccer_fifa_world_cup
ODDS_API_REGIONS=us,uk,eu
ODDS_API_MARKETS=h2h
API_FOOTBALL_KEY=...
API_FOOTBALL_LEAGUE_ID=1
API_FOOTBALL_SEASON=2026
CRON_SECRET=use-a-long-random-secret
```

Do not commit API keys to GitHub.

## First sync after deployment

Run these URLs in the browser after replacing the domain and secret:

```text
https://YOUR-APP.vercel.app/api/sync/fixtures?secret=YOUR_CRON_SECRET
https://YOUR-APP.vercel.app/api/sync/odds?secret=YOUR_CRON_SECRET
```

Then share:

```text
https://YOUR-APP.vercel.app
```

## Notes

If The Odds API returns no events for `soccer_fifa_world_cup`, call its `/v4/sports` endpoint and update `ODDS_API_SPORT_KEY` to the active tournament key. API-Football league IDs can also vary by account, so update `API_FOOTBALL_LEAGUE_ID` if needed.

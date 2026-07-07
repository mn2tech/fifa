// NM2TECH — World Cup 2026 live scores proxy
// Fetches from football-data.org server-side so the API key stays secret.
// Edge-cached for 60s so many viewers cost ~1 upstream request/minute (free tier safe).

export default async function handler(req, res) {
  const key = process.env.FOOTBALL_DATA_KEY;
  if (!key) {
    return res.status(500).json({ error: 'FOOTBALL_DATA_KEY env var not set in Vercel project settings' });
  }
  try {
    const r = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 'X-Auth-Token': key },
    });
    if (!r.ok) {
      return res.status(502).json({ error: 'Upstream error ' + r.status });
    }
    const data = await r.json();
    const matches = (data.matches || []).map((m) => ({
      stage: m.stage,
      status: m.status,               // SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED
      utcDate: m.utcDate,
      minute: m.minute ?? null,
      home: m.homeTeam?.name || '',
      away: m.awayTeam?.name || '',
      homeTla: m.homeTeam?.tla || '',
      awayTla: m.awayTeam?.tla || '',
      sh: m.score?.fullTime?.home ?? null,
      sa: m.score?.fullTime?.away ?? null,
      ph: m.score?.penalties?.home ?? null,
      pa: m.score?.penalties?.away ?? null,
      winner: m.score?.winner ?? null, // HOME_TEAM | AWAY_TEAM | DRAW | null
    }));
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({ matches, fetchedAt: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}

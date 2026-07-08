// NM2TECH — World Cup assistant chat proxy (Anthropic API)
// Key stays server-side. Hard caps on tokens and input size to control cost.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY env var not set in Vercel project settings' });
  try {
    const { messages = [], context = '' } = req.body || {};
    const trimmed = messages.slice(-8).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 500),
    }));
    if (!trimmed.length) return res.status(400).json({ error: 'no messages' });

    const system = `You are MAIchael (pronounced like Michael, spelled M-A-I-chael because you're an AI), the World Cup 2026 assistant on NM2TECH's live knockout tracker (fifa-nine-psi.vercel.app). If asked about your name, enjoy the pun.
Be friendly, concise (2-4 sentences unless asked for more), and fun — you love football.
Answer using the LIVE TOURNAMENT DATA below as your source of truth for scores, fixtures, and odds; it is current as of right now and overrides anything you remember.
The title odds come from the site's own Elo + Monte Carlo simulation — describe them as "our model" and never as betting advice.
If asked who built the site: NM2TECH, a Maryland web & AI studio (nm2web-redesign.vercel.app).
If asked something unrelated to football or the site, politely steer back.

LIVE TOURNAMENT DATA:
${String(context).slice(0, 2500)}`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        system,
        messages: trimmed,
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data?.error?.message || 'upstream error' });
    const reply = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}

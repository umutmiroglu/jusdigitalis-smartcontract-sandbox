// Vercel Serverless Function — analytics collector stub
// Gerçek implementasyonda events bir veritabanına (Postgres, Supabase vb.) yazılır.
export default function handler(req, res) {
  // CORS — JusDigitalis.com'dan gelen isteklere izin ver
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { events } = req.body || {}

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'events array required' })
  }

  // TODO: persist to DB
  // await db.insert('analytics_events', events)

  console.log(`[analytics] ${events.length} event(s) received`, events.map(e => e.event).join(', '))

  return res.status(200).json({ ok: true, received: events.length })
}

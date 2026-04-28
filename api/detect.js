export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text } = req.body;
  if (!text || text.length < 50) {
    return res.status(400).json({ error: 'Teks terlalu pendek.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const prompt = `Kamu adalah sistem pendeteksi teks AI yang sangat ahli. Analisis teks berikut dan tentukan apakah ditulis oleh AI atau manusia.

Teks untuk dianalisis:
"""
${text}
"""

Berikan respons HANYA dalam format JSON berikut (tidak ada teks lain di luar JSON, tanpa markdown):
{
  "ai_probability": <angka 0-100>,
  "verdict": "<'AI' | 'MANUSIA' | 'CAMPURAN'>",
  "confidence": "<'Sangat Yakin' | 'Cukup Yakin' | 'Tidak Pasti'>",
  "signals": [
    {"type": "<'negative'|'positive'|'neutral'>", "text": "<deskripsi singkat sinyal, maks 8 kata>"}
  ],
  "analysis": "<paragraf analisis dalam bahasa Indonesia, 3-4 kalimat>"
}

Panduan:
- negative = indikator AI (struktur terlalu rapi, dll)
- positive = indikator manusia (typo, ekspresi informal, dll)
- neutral = bisa keduanya
- Maksimal 6 sinyal
- ai_probability 0 = pasti manusia, 100 = pasti AI`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1000 }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Gemini API error');

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Gagal menganalisis: ' + err.message });
  }
}

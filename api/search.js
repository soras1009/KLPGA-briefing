export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { players, dateLabel } = req.body;
  if (!players || !dateLabel) {
    return res.status(400).json({ error: '선수 목록과 날짜가 필요합니다.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 없습니다.' });
  }

  try {
    const prompt = `${dateLabel} 기준 가장 최근 KLPGA 투어 경기에서 다음 선수들의 결과를 찾아줘: ${players.join(', ')}.
결과를 반드시 아래 JSON 형식으로만 반환해. 다른 텍스트나 마크다운 없이 순수 JSON만.
{"found":true,"tournament":"대회명","round":"최종라운드 등","date":"날짜","players":[{"name":"선수명","rank":"1위 등","score":"-15 등","note":"특이사항 없으면 빈문자열"}],"highlight":"이번 대회 한줄요약"}
선수가 출전하지 않았거나 컷 탈락했으면 note에 표기.
경기 정보를 못 찾으면: {"found":false,"reason":"이유"}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.1 }
        })
      }
    );

    const data = await response.json();
    console.log('[응답]', JSON.stringify(data).substring(0, 500));

    const text = data?.candidates?.[0]?.content?.parts
      ?.filter(p => p.text)
      ?.map(p => p.text)
      ?.join('') || '';

    console.log('[텍스트]', text.substring(0, 300));

    if (!text) {
      return res.status(200).json({ found: false, reason: 'Gemini 응답이 비어있습니다.' });
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(200).json({ found: false, reason: '파싱 실패: ' + text.substring(0, 100) });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);

  } catch (err) {
    console.error('[오류]', err);
    return res.status(500).json({ error: err.message });
  }
}

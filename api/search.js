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

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: `KLPGA 골프 경기 결과 전문가. 웹 검색으로 해당 날짜 기준 가장 최근 KLPGA 경기에서 지정 선수들의 결과를 찾아라.
반드시 아래 JSON 형식만 출력하라. 다른 텍스트 절대 금지.
{"found":true,"tournament":"대회명","round":"라운드","date":"날짜","players":[{"name":"선수명","rank":"순위","score":"스코어","note":""}],"highlight":"한줄요약"}
못찾으면: {"found":false,"reason":"이유"}`,
        messages: [{
          role: 'user',
          content: `${dateLabel} 기준 최근 KLPGA 경기에서 다음 선수 결과를 JSON으로만 반환: ${players.join(', ')}`
        }]
      })
    });

    const data = await response.json();

    let allText = '';
    for (const block of data.content) {
      if (block.type === 'text' && block.text) allText += block.text;
    }

    const jsonMatch = allText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(200).json({ found: false, reason: '경기 정보를 파싱하지 못했습니다.' });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

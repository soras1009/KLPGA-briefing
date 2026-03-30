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
    console.log('[1] API 호출 - 선수:', players.join(', '), '날짜:', dateLabel);
    console.log('[2] API 키 존재:', !!process.env.ANTHROPIC_API_KEY);

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
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        tool_choice: { type: 'auto' },
        system: `너는 KLPGA 골프 경기 결과를 검색하고 요약하는 전문가야.
웹 검색을 사용해서 주어진 날짜 기준 가장 최근 KLPGA 투어 경기 결과를 찾아라.
그리고 지정된 선수들의 순위와 스코어를 찾아라.
마지막에 반드시 아래 JSON 형식으로만 답해라. 다른 텍스트 없이 JSON만.
{"found":true,"tournament":"대회명","round":"라운드","date":"날짜","players":[{"name":"선수명","rank":"순위","score":"스코어","note":""}],"highlight":"한줄요약"}
경기 정보를 못 찾으면: {"found":false,"reason":"이유"}`,
        messages: [{
          role: 'user',
          content: `${dateLabel} 기준 가장 최근 KLPGA 투어 경기에서 다음 선수들의 결과를 찾아줘: ${players.join(', ')}`
        }]
      })
    });

    console.log('[3] HTTP 상태:', response.status);
    const data = await response.json();
    console.log('[4] stop_reason:', data.stop_reason);
    console.log('[5] content 수:', data.content?.length);
    console.log('[6] 전체응답(500자):', JSON.stringify(data).substring(0, 500));

    let allText = '';
    for (const block of (data.content || [])) {
      if (block.type === 'text' && block.text) allText += block.text;
    }

    console.log('[7] 추출텍스트:', allText.substring(0, 300));

    if (!allText) {
      return res.status(200).json({ found: false, reason: `응답 없음. stop_reason=${data.stop_reason}, error=${JSON.stringify(data.error)}` });
    }

    const bigMatch = allText.match(/\{[\s\S]*\}/);
    if (!bigMatch) {
      return res.status(200).json({ found: false, reason: '파싱실패. 텍스트: ' + allText.substring(0, 100) });
    }

    const parsed = JSON.parse(bigMatch[0]);
    return res.status(200).json(parsed);

  } catch (err) {
    console.error('[catch]', err);
    return res.status(500).json({ error: err.message });
  }
}

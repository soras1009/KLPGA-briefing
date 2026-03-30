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

    // 응답 구조 안전하게 처리
    let allText = '';
    const content = data.content || data.messages || [];

    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === 'text' && block.text) {
          allText += block.text;
        }
        // tool_result 블록 안의 텍스트도 추출
        if (block.type === 'tool_result' && Array.isArray(block.content)) {
          for (const inner of block.content) {
            if (inner.type === 'text' && inner.text) allText += inner.text;
          }
        }
      }
    } else if (typeof data === 'object') {
      allText = JSON.stringify(data);
    }

    if (!allText) {
      return res.status(200).json({ found: false, reason: 'API 응답이 비어있습니다.' });
    }

    const jsonMatch = allText.match(/\{[\s\S]*?\}/g);
    if (!jsonMatch) {
      return res.status(200).json({ found: false, reason: '경기 정보를 파싱하지 못했습니다.' });
    }

    // JSON 블록 중 found 키가 있는 것 찾기
    let parsed = null;
    for (const candidate of jsonMatch.reverse()) {
      try {
        const obj = JSON.parse(candidate);
        if ('found' in obj) { parsed = obj; break; }
      } catch (e) {}
    }

    if (!parsed) {
      // 전체 텍스트에서 가장 긴 JSON 시도
      try {
        const bigMatch = allText.match(/\{[\s\S]*\}/);
        if (bigMatch) parsed = JSON.parse(bigMatch[0]);
      } catch (e) {}
    }

    if (!parsed) {
      return res.status(200).json({ found: false, reason: '결과를 파싱하지 못했습니다.' });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { brand } = await request.json();

      if (!brand || brand.trim().length === 0) {
        return new Response(JSON.stringify({ error: 'Brand name is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'web-search-2025-03-05',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 4000,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [
            {
              role: 'user',
              content: `You are a senior brand strategist. Conduct a thorough competitive brand audit for "${brand}". Search the web to find current, accurate information about this brand's positioning, messaging, visual identity, and market standing.

Return ONLY a valid JSON object — no preamble, no markdown fences, no explanation. Use this exact structure:

{
  "brand": "Official brand name",
  "tagline": "Their current tagline or slogan",
  "overview": "2-3 sentence brand summary",
  "coreIdentity": {
    "purpose": "Why does this brand exist beyond profit?",
    "values": ["value1", "value2", "value3"],
    "targetAudience": "Detailed description of primary customer",
    "valueProposition": "The core promise this brand makes to customers"
  },
  "verbalIdentity": {
    "toneOfVoice": "How the brand communicates (e.g. bold and irreverent, warm and aspirational)",
    "messagingPillars": ["pillar1", "pillar2", "pillar3"],
    "languageStyle": "Specific language patterns, vocabulary choices, sentence structure"
  },
  "visualIdentity": {
    "logoStyle": "Description of logo design and symbolism",
    "colorPalette": "Primary and secondary brand colors and what they convey",
    "typography": "Font choices and what they communicate",
    "imageryStyle": "Photography and visual content style",
    "overallAesthetic": "The gestalt of the brand's visual world"
  },
  "marketPositioning": {
    "positioningStatement": "Where this brand sits in the market",
    "topCompetitors": ["competitor1", "competitor2", "competitor3"],
    "competitiveStrengths": ["strength1", "strength2", "strength3"],
    "competitiveWeaknesses": ["weakness1", "weakness2"]
  },
  "whitespace": {
    "gaps": "What emotional or functional territory this brand leaves unaddressed",
    "opportunities": "Specific market opportunities a competitor could exploit",
    "strategicRecommendation": "If you were launching a competing brand, what positioning would you pursue and why?"
  }
}`,
            },
          ],
        }),
      });

      const data = await response.json();

      // Extract text content from all content blocks
      let auditText = '';
      for (const block of data.content) {
        if (block.type === 'text') {
          auditText += block.text;
        }
      }

      // Strip any markdown fences if Claude added them anyway
      const clean = auditText.replace(/```json|```/g, '').trim();

      // Extract JSON object
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const audit = JSON.parse(jsonMatch[0]);

      return new Response(JSON.stringify(audit), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

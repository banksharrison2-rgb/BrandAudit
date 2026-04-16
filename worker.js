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
          max_tokens: 8000,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [
            {
              role: 'user',
              content: `You are a senior brand strategist and market analyst. Conduct a thorough 360-degree brand audit for "${brand}". Use web search extensively to find current, accurate information — search for recent news, product launches, campaigns, financial reports, social media presence, and competitive landscape.

Return ONLY a valid JSON object — no preamble, no markdown fences, no explanation. Use this exact structure:

{
  "brand": "Official brand name",
  "tagline": "Their current tagline or slogan",
  "overview": "2-3 sentence brand summary",
  "domain": "primarydomain.com (e.g. nike.com — just the domain, no https://)",

  "coreIdentity": {
    "purpose": "Why does this brand exist beyond profit?",
    "values": ["value1", "value2", "value3"],
    "targetAudience": "Detailed description of primary customer",
    "valueProposition": "The core promise this brand makes to customers"
  },

  "verbalIdentity": {
    "toneOfVoice": "How the brand communicates",
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
  },

  "recentNews": [
    {
      "headline": "News headline",
      "summary": "1-2 sentence summary of the story",
      "date": "Month Year or approximate date",
      "source": "Publication name"
    }
  ],

  "recentLaunches": [
    {
      "name": "Product or service name",
      "description": "What it is and why it matters for the brand",
      "date": "Month Year",
      "imageUrl": "Direct URL to a product image if found in search results, otherwise null"
    }
  ],

  "recentCampaigns": [
    {
      "name": "Campaign name or description",
      "description": "What the campaign was, the message, and the execution",
      "platforms": ["Instagram", "TV", "OOH"],
      "impact": "Measurable or qualitative impact if known"
    }
  ],

  "financialSnapshot": {
    "publicOrPrivate": "public or private",
    "revenue": "Most recent annual revenue figure with year, e.g. $4.4B (2024). Use 'Not publicly disclosed' if private and unknown.",
    "revenueGrowth": "YoY growth rate if available, e.g. +12% YoY. Otherwise 'Not disclosed'.",
    "valuation": "Market cap if public, last known valuation if private, or 'Not disclosed'",
    "keyMetrics": ["Notable metric 1", "Notable metric 2"],
    "recentQuarterHighlight": "Most recent notable quarterly result or financial development"
  },

  "socialPresence": {
    "topPlatforms": ["Platform1", "Platform2"],
    "estimatedFollowers": "Combined or per-platform follower count estimate",
    "contentStrategy": "What type of content they post and how often",
    "engagementStyle": "How they interact with their community",
    "recentHighlight": "A notable recent social moment, viral post, or campaign"
  },

  "brandMomentum": {
    "signal": "growing or steady or declining",
    "summary": "2-3 sentence assessment of where the brand is headed right now",
    "keyDrivers": ["Driver 1", "Driver 2", "Driver 3"]
  }
}

Search for: recent news about ${brand}, ${brand} product launches 2024 2025, ${brand} marketing campaigns, ${brand} revenue financials, ${brand} social media following, ${brand} quarterly results.

Include 3-5 recent news items, 2-4 recent launches, and 2-3 recent campaigns. Use real data from your searches.`,
            },
          ],
        }),
      });

      const data = await response.json();

      let auditText = '';
      for (const block of data.content) {
        if (block.type === 'text') {
          auditText += block.text;
        }
      }

      const clean = auditText.replace(/```json|```/g, '').trim();

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

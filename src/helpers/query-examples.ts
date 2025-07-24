export const DOTA_QUERY_EXAMPLES = {
  // Common search patterns
  searchPatterns: {
    player: ["player", "steam", "account", "profile", "user"],
    playerStats: ["winrate", "matches", "performance", "ranking", "mmr", "behavior"],
    match: ["match", "game", "duration", "winner", "radiant", "dire"],
    matchDetails: ["players", "heroes", "items", "builds", "picks", "bans"],
    hero: ["hero", "character", "champion", "abilities", "talents"],
    heroStats: ["winrate", "popularity", "meta", "performance", "counters"],
    league: ["league", "tournament", "professional", "esports", "competition"],
    leagueData: ["teams", "matches", "standings", "bracket", "schedule"]
  },

  // Query templates with explanations
  templates: {
    playerBasicInfo: {
      description: "Get basic player information and statistics",
      keywords: ["player", "steam", "profile"],
      query: `query GetPlayer($steamId: Long!) {
  player(steamAccountId: $steamId) {
    steamAccount {
      name
      avatar
      profileUri
    }
    matchCount
    winCount
    imp
    # More fields available - use search-schema to discover
  }
}`,
      variables: '{"steamId": "123456789"}',
      notes: "Replace steamId with actual Steam ID (32-bit format)"
    },

    playerHeroPerformance: {
      description: "Analyze player performance with specific heroes",
      keywords: ["player", "hero", "performance", "winrate"],
      query: `query GetPlayerHeroes($steamId: Long!, $take: Int = 10) {
  player(steamAccountId: $steamId) {
    heroesPerformance(take: $take) {
      hero {
        displayName
        shortName
      }
      matchCount
      winCount
      avgImp
      # Use introspect-type on HeroPerformanceType for more fields
    }
  }
}`,
      variables: '{"steamId": "123456789", "take": 10}',
      notes: "Shows top heroes by match count with win statistics"
    },

    matchDetails: {
      description: "Get comprehensive match information",
      keywords: ["match", "players", "heroes", "duration"],
      query: `query GetMatch($matchId: Long!) {
  match(id: $matchId) {
    durationSeconds
    didRadiantWin
    gameMode
    startDateTime
    players {
      steamAccount { name }
      hero { displayName }
      kills
      deaths
      assists
      networth
      level
      # Much more available - search for "player", "stats"
    }
  }
}`,
      variables: '{"matchId": "7891234567"}',
      notes: "Use 64-bit match ID from match history"
    },

    heroMetaStats: {
      description: "Get hero popularity and win rate statistics",
      keywords: ["hero", "winrate", "popularity", "meta"],
      query: `query GetHeroStats($heroId: Short, $bracket: RankBracket) {
  heroStats {
    heroVsHeroMatchup(heroId: $heroId, bracket: $bracket) {
      hero { displayName }
      winCount
      matchCount
      # Search for "advantage", "matchup" for more fields
    }
  }
}`,
      variables: '{"heroId": 1, "bracket": "DIVINE_IMMORTAL"}',
      notes: "Analyze hero performance in different skill brackets"
    }
  },

  // Common workflow patterns
  workflows: {
    playerAnalysis: [
      'search-schema(keywords: ["player", "steam"])',
      'query-graphql(query: playerBasicInfo template)',
      'search-schema(keywords: ["player", "hero", "performance"])',
      'query-graphql(query: playerHeroPerformance template)'
    ],
    
    matchAnalysis: [
      'search-schema(keywords: ["match", "duration", "players"])',
      'query-graphql(query: matchDetails template)',
      'search-schema(keywords: ["match", "items", "builds"])',
      'introspect-type(typeName: "MatchPlayerType", maxDepth: 2)'
    ],

    heroResearch: [
      'search-schema(keywords: ["hero", "stats", "winrate"])',
      'introspect-type(typeName: "HeroType", maxDepth: 2)',
      'search-schema(keywords: ["hero", "matchup", "advantage"])',
      'query-graphql(query: heroMetaStats template)'
    ]
  },

  // Common Steam ID formats and conversion notes
  steamIdNotes: `
Steam ID Formats:
- Steam3 ID: [U:1:123456789] → Use 123456789
- Steam64 ID: 76561198083722517 → Convert to 32-bit: subtract 76561197960265728
- Steam Community URL: /profiles/76561198083722517/ → Extract and convert
- Profile URL: /id/customname/ → Need to resolve to Steam ID first
`,

  // Error handling patterns
  commonErrors: {
    "Player not found": "Check Steam ID format (use 32-bit account ID)",
    "Match not found": "Verify match ID is correct 64-bit format",
    "Field does not exist": "Use search-schema to find correct field names",
    "Authentication required": "Some data requires valid API token in headers"
  }
};

export function getWorkflowGuidance(intent: string): string[] {
  const intentLower = intent.toLowerCase();
  
  if (intentLower.includes('player')) {
    return DOTA_QUERY_EXAMPLES.workflows.playerAnalysis;
  } else if (intentLower.includes('match')) {
    return DOTA_QUERY_EXAMPLES.workflows.matchAnalysis;
  } else if (intentLower.includes('hero')) {
    return DOTA_QUERY_EXAMPLES.workflows.heroResearch;
  }
  
  return [
    'search-schema(keywords: [relevant keywords for your query])',
    'introspect-type(typeName: "FoundType", maxDepth: 2)',
    'query-graphql(query: "your GraphQL query here")'
  ];
}

export function suggestKeywords(query: string): string[] {
  const queryLower = query.toLowerCase();
  const suggestions: string[] = [];
  
  Object.entries(DOTA_QUERY_EXAMPLES.searchPatterns).forEach(([category, keywords]) => {
    if (keywords.some(keyword => queryLower.includes(keyword))) {
      suggestions.push(...keywords);
    }
  });
  
  return [...new Set(suggestions)].slice(0, 8);
}
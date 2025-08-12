#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import express from "express";
import cors from "cors";
import { createServer } from "http";

// Environment schema with required STRATZ token
const EnvSchema = z.object({
	NAME: z.string().default("dota-mcp-server"),
	STRATZ_API_TOKEN: z.string().min(1, "STRATZ_API_TOKEN is required"),
	ENDPOINT: z.string().url().default("https://api.stratz.com/graphql"),
	PORT: z.string().default("3002").transform((val) => parseInt(val, 10)),
	HOST: z.string().default("0.0.0.0"),
});

const env = EnvSchema.parse(process.env);

const app = express();
app.use(cors({
	origin: "*",
	methods: ["GET", "POST", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
	credentials: false
}));
app.use(express.json());

const server = new McpServer({
	name: env.NAME,
	version: "1.0.0",
	description: "Dota 2 analytics MCP server powered by STRATZ API",
});

// Common headers with auth
const getHeaders = () => ({
	"Content-Type": "application/json",
	"Authorization": `Bearer ${env.STRATZ_API_TOKEN}`,
});

// Response cache for API optimization
const responseCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 300000; // 5 minutes

// Rate limiting
const rateLimiter = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 30;

// Deterministic error response
function createErrorResponse(tool: string, error: unknown): any {
	const errorMessage = error instanceof Error ? error.message : String(error);
	return {
		isError: true,
		content: [{
			type: "text",
			text: JSON.stringify({
				error: errorMessage,
				tool,
				timestamp: new Date().toISOString(),
				success: false
			}, null, 2)
		}]
	};
}

// Deterministic success response
function createSuccessResponse(data: any): any {
	return {
		content: [{
			type: "text", 
			text: JSON.stringify({
				...data,
				success: true,
				timestamp: new Date().toISOString()
			}, null, 2)
		}]
	};
}

// Tool validation and normalization
function validateToolInput(toolName: string, input: any): any {
	try {
		// Normalize Steam Account IDs (convert 64-bit to 32-bit if needed)
		if (input.steamAccountId && input.steamAccountId > 76561197960265728) {
			input.steamAccountId = input.steamAccountId - 76561197960265728;
		}
		
		// Validate match IDs
		if (input.matchId && (input.matchId < 1000000000 || input.matchId > 9999999999)) {
			throw new Error(`Invalid match ID: ${input.matchId}`);
		}
		
		// Validate hero IDs
		if (input.heroId && (input.heroId < 1 || input.heroId > 150)) {
			throw new Error(`Invalid hero ID: ${input.heroId}`);
		}
		
		return input;
	} catch (error) {
		throw new Error(`Input validation failed for ${toolName}: ${error}`);
	}
}

// Enhanced GraphQL request with caching, validation, and rate limiting
async function executeGraphQL(query: string, variables?: Record<string, any>) {
	const cacheKey = JSON.stringify({ query, variables });
	const cached = responseCache.get(cacheKey);
	
	// Return cached result if valid
	if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
		return cached.data;
	}

	// Check rate limiting
	const now = Date.now();
	const windowStart = now - RATE_LIMIT_WINDOW;
	const recentRequests = Array.from(rateLimiter.values()).filter(timestamp => timestamp > windowStart);
	
	if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
		throw new Error(`Rate limit exceeded: ${MAX_REQUESTS_PER_MINUTE} requests per minute`);
	}

	// Record this request
	rateLimiter.set(cacheKey, now);
	
	// Clean old rate limit entries
	for (const [key, timestamp] of rateLimiter.entries()) {
		if (timestamp <= windowStart) {
			rateLimiter.delete(key);
		}
	}

	try {
		const response = await fetch(env.ENDPOINT, {
			method: "POST",
			headers: getHeaders(),
			body: JSON.stringify({ query, variables }),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`STRATZ API error ${response.status}: ${errorText}`);
		}

		const data = await response.json();
		
		if (data.errors?.length) {
			throw new Error(`GraphQL errors: ${JSON.stringify(data.errors, null, 2)}`);
		}

		// Cache successful response
		responseCache.set(cacheKey, { data: data.data, timestamp: Date.now() });
		
		return data.data;
	} catch (error) {
		throw new Error(`GraphQL request failed: ${error}`);
	}
}

// Resources for documentation
server.resource("doc://dota/quickstart", "doc://dota/quickstart", async () => ({
	contents: [{
		uri: "doc://dota/quickstart",
		text: `# Dota 2 Professional Coaching MCP Server

## Authentication
Set STRATZ_API_TOKEN environment variable with your STRATZ API token from https://stratz.com/api

## Professional Workflows

### 🎯 Player Coaching Workflow
1. **dota.player.profile** → Basic rank/stats overview
2. **dota.player.benchmarks** → Performance vs rank averages (KEY!)
3. **dota.player.itemTimings** → Item timing patterns and consistency
4. **dota.player.matches** → Recent performance trends
5. **Prompt: analyze-player** → Generate coaching report

### 📊 Match Analysis Workflow  
1. **dota.match.summary** → Match outcome and basic info
2. **dota.match.itemTimings** → Power spike analysis (CORE!)
3. **dota.match.players** → Individual performance metrics
4. **Prompt: analyze-match** → Deep match breakdown

### 🏆 Meta Research Workflow
1. **dota.meta.heroStats** → Current patch tier list
2. **dota.meta.counters** → Hero matchup analysis
3. **dota.meta.synergy** → Team composition synergies
4. **Prompt: meta-report** → Complete meta guide

### 🎲 Draft Assistance Workflow
1. **dota.meta.counters** → Counter-pick analysis
2. **dota.meta.synergy** → Team synergy evaluation
3. **Prompt: draft-counsel** → Professional draft guidance

## Key Coaching Metrics
- **GPM/XPM**: Farming efficiency benchmarks
- **LH@10**: Early game laning performance
- **Item Timings**: Power spike consistency (Blink@13min, BKB@20min)
- **IMP Score**: Individual Match Performance (-100 to +100)
- **Win Rate Patterns**: Hero-specific and role-specific performance

## Steam ID Format
- ✅ Use 32-bit Steam Account ID: 86745912
- ❌ NOT 64-bit Steam ID: 76561198046011640
- Convert: steamID64 - 76561197960265728 = steamAccountID

## Error Handling
- 403: Missing/invalid STRATZ_API_TOKEN → Check token at stratz.com/api
- Player not found: Verify Steam ID format (must be 32-bit)
- No data: Player profile may be private or Steam ID incorrect
- Rate limiting: STRATZ has request limits (2000/hour for logged-in users)`
	}]
}));

server.resource("doc://dota/ids", "doc://dota/ids", async () => ({
	contents: [{
		uri: "doc://dota/ids",
		text: `# Dota 2 ID Reference & Coaching Benchmarks

## Steam Account ID Conversion
- Use 32-bit Steam Account ID: 86745912
- NOT 64-bit Steam ID: 76561198046011640  
- **Formula**: steamID64 - 76561197960265728 = steamAccountID
- **Tool**: Use steamid.io for quick conversion

## Meta Hero IDs (Patch 7.35+)
### Tier S Meta Heroes
- **Pudge**: 14 (86% contest rate TI13)
- **Invoker**: 74 (High skill ceiling carry/mid)
- **Anti-Mage**: 1 (Late game carry)
- **Crystal Maiden**: 5 (Support meta)
- **Sniper**: 35 (Mid/carry flex)

### Role-Specific Meta
- **Mid**: Invoker (74), Pudge (14), Sniper (35)
- **Carry**: Anti-Mage (1), Drow Ranger (6), Phantom Assassin (44)
- **Support**: Crystal Maiden (5), Lion (26), Dazzle (50)
- **Offlane**: Pudge (14), Axe (2), Centaur Warrunner (96)

## Key Item IDs & Expected Timings
### Core Items (Professional Standards)
- **Blink Dagger**: 1 → 12-13 min (780s)
- **Black King Bar**: 116 → 18-22 min (1200s)
- **Aghanim's Scepter**: 108 → 25-30 min (1500s)
- **Divine Rapier**: 133 → 35+ min (2100s+)

### Early Game Items
- **Boots of Speed**: 29 → 4-6 min (300s)
- **Magic Wand**: 34 → 6-8 min (400s)
- **Power Treads**: 63 → 8-12 min (600s)

### Luxury Items  
- **Radiance**: 137 → 15-20 min (900s) for dedicated carriers
- **Butterfly**: 152 → 35+ min
- **Scythe of Vyse**: 156 → 30+ min

## Performance Benchmarks by Rank

### GPM Targets by Role & Bracket
| Rank | Carry GPM | Mid GPM | Offlane GPM | Support GPM |
|------|-----------|---------|-------------|-------------|
| Herald-Guardian | 400+ | 350+ | 300+ | 200+ |
| Crusader-Archon | 500+ | 450+ | 400+ | 250+ |
| Legend-Ancient | 600+ | 550+ | 500+ | 300+ |
| Divine-Immortal | 700+ | 650+ | 600+ | 350+ |

### Laning Benchmarks (Last Hits @ 10 min)
| Rank | Carry LH@10 | Mid LH@10 | Offlane LH@10 |
|------|-------------|-----------|---------------|
| Herald-Guardian | 40+ | 35+ | 25+ |
| Crusader-Archon | 55+ | 50+ | 35+ |
| Legend-Ancient | 70+ | 65+ | 45+ |
| Divine-Immortal | 80+ | 75+ | 55+ |

### KDA Expectations
- **Carry**: 2.5+ KDA (focus on survival)
- **Mid**: 3.0+ KDA (high impact expected)
- **Offlane**: 2.0+ KDA (initiator role)
- **Support**: 2.0+ KDA (enabling others)

## Common Coaching Flags
- **GPM < 300**: Fundamental farming issues
- **LH@10 < 30**: Laning mechanics need work
- **KDA < 1.5**: Positioning and decision-making problems
- **IMP < -20**: Not contributing to team's success
- **Late item timings**: Efficiency and map awareness issues`
	}]
}));

// Prompts for common workflows
// P0 MUST HAVE: Enhanced Playbooks (Prompts + Resources)
server.prompt("analyze-player", "Complete player performance analysis with benchmarks and advice", {
	steamAccountId: z.number().describe("32-bit Steam Account ID"),
	role: z.enum(["CORE", "SUPPORT", "OFFLANE", "MID", "SAFE_LANE"]).optional().describe("Focus on specific role"),
	bracket: z.enum(["HERALD", "GUARDIAN", "CRUSADER", "ARCHON", "LEGEND", "ANCIENT", "DIVINE", "IMMORTAL"]).optional().describe("Rank bracket for comparison")
}, async ({ steamAccountId, role, bracket }) => ({
	messages: [{
		role: "user",
		content: {
			type: "text",
			text: `Perform comprehensive analysis of player ${steamAccountId}:

**Step 1: Profile Overview**
- Use dota.player.profile({ steamAccountId: ${steamAccountId} }) for rank and basic stats

**Step 2: Performance Benchmarks**
- Use dota.player.benchmarks({ steamAccountId: ${steamAccountId}, role: "${role || 'ALL'}", bracket: "${bracket || 'ALL'}" })
- Focus on GPM/XPM/KDA vs rank averages
- Identify specific weaknesses (farming, laning, teamfight impact)

**Step 3: Recent Match Analysis**
- Use dota.player.matches({ steamAccountId: ${steamAccountId}, take: 10 })
- Look for patterns in hero performance and game impact

**Step 4: Item Timing Patterns**
- Use dota.player.itemTimings({ steamAccountId: ${steamAccountId}, take: 10 })
- Check for consistent power spike timings

**Step 5: Actionable Coaching Plan**
- Provide 3 specific improvement areas with concrete targets
- Suggest practice drills and focus areas
- Set measurable goals (e.g., "improve LH@10 from 35 to 50")

Format as a professional coaching report with clear recommendations.`
		}
	}]
}));

server.prompt("analyze-match", "Deep match analysis with item timings and turning points", {
	matchId: z.number().describe("Match ID"),
	focusPlayer: z.number().optional().describe("Steam Account ID to focus analysis on")
}, async ({ matchId, focusPlayer }) => ({
	messages: [{
		role: "user",
		content: {
			type: "text",
			text: `Analyze match ${matchId} comprehensively:

**Step 1: Match Overview**
- Use dota.match.summary({ matchId: ${matchId} }) for basic info and outcome

**Step 2: Player Performance**
- Use dota.match.players({ matchId: ${matchId} }) for detailed stats
- Identify MVP and worst performer with specific metrics

**Step 3: Item Timing Analysis**
- Use dota.match.itemTimings({ matchId: ${matchId}${focusPlayer ? `, steamAccountId: ${focusPlayer}` : ''} })
- Evaluate power spike timings vs expected for rank
- Identify farming efficiency issues

**Step 4: Key Moments & Turning Points**
- Analyze early game (0-15 min): laning phase, first items
- Mid game (15-30 min): teamfights, objective control
- Late game (30+ min): high ground pushes, critical decisions

**Step 5: Learning Points**
- What could each team have done differently?
- Specific mistakes that led to the outcome
- Draft advantages/disadvantages that materialized

Focus on actionable insights that players can apply to future games.`
		}
	}]
}));

server.prompt("meta-report", "Current meta analysis with patch-specific insights", {
	patch: z.string().optional().describe("Patch version (defaults to current)"),
	bracket: z.enum(["HERALD", "GUARDIAN", "CRUSADER", "ARCHON", "LEGEND", "ANCIENT", "DIVINE", "IMMORTAL"]).optional().describe("Rank bracket focus")
}, async ({ patch, bracket }) => ({
	messages: [{
		role: "user",
		content: {
			type: "text",
			text: `Generate comprehensive meta report for patch ${patch || 'current'}, bracket ${bracket || 'ALL'}:

**Step 1: Hero Tier List**
- Use dota.meta.heroStats({ patch: "${patch || 'current'}", bracket: "${bracket || 'ALL'}" })
- Identify S-tier, A-tier, and rising heroes
- Note pick/ban rates and win rates

**Step 2: Role-Specific Meta**
- Analyze carry/mid/offlane/support meta separately
- Which heroes dominate each role in current patch?

**Step 3: Key Matchups**
- Use dota.meta.counters for top meta heroes
- Identify strongest counter picks
- Note heroes that need to be respected in draft

**Step 4: Item/Build Trends**
- What items are being built more/less this patch?
- Any significant build variations from pro scene?

**Step 5: Strategic Trends**
- Early game vs late game meta
- Teamfight vs split push preference
- Objective control patterns

Format as a concise meta guide for players in this bracket.`
		}
	}]
}));

server.prompt("draft-counsel", "Professional draft assistance and analysis", {
	ourPicks: z.array(z.number()).optional().describe("Our team's picked hero IDs"),
	enemyPicks: z.array(z.number()).optional().describe("Enemy team's picked hero IDs"),
	phase: z.enum(["PICK_BAN", "PICK_PHASE", "COMPLETE"]).default("PICK_PHASE").describe("Current draft phase"),
	bracket: z.enum(["HERALD", "GUARDIAN", "CRUSADER", "ARCHON", "LEGEND", "ANCIENT", "DIVINE", "IMMORTAL"]).optional().describe("Rank bracket")
}, async ({ ourPicks, enemyPicks, phase, bracket }) => ({
	messages: [{
		role: "user",
		content: {
			type: "text",
			text: `Provide professional draft analysis:

**Current State:**
- Our picks: ${ourPicks?.join(', ') || 'None yet'}
- Enemy picks: ${enemyPicks?.join(', ') || 'None yet'}
- Draft phase: ${phase}
- Target bracket: ${bracket || 'ALL'}

**Analysis Steps:**

**Step 1: Enemy Team Analysis**
${enemyPicks?.map(heroId => `- Use dota.meta.counters({ heroId: ${heroId}, bracket: "${bracket || 'ALL'}" }) to find counters`).join('\n') || '- Analyze enemy picks as they become available'}

**Step 2: Synergy Analysis**
${ourPicks?.map(heroId => `- Use dota.meta.synergy({ heroId: ${heroId}, bracket: "${bracket || 'ALL'}" }) for good teammates`).join('\n') || '- Evaluate team synergy as picks develop'}

**Step 3: Draft Recommendations**
- Identify priority bans against enemy strategy
- Suggest strong picks that counter enemy composition
- Recommend heroes with good synergy with our team
- Consider role balance and game plan

**Step 4: Strategic Advice**
- What is enemy team's win condition?
- What should be our game plan?
- Key timings to play around
- Itemization priorities

Provide specific hero recommendations with reasoning.`
		}
	}]
}));

// Strict schema definitions with examples
const SteamAccountSchema = z.number()
	.int()
	.positive()
	.min(1000000, "Invalid Steam Account ID")
	.max(4294967295, "Invalid Steam Account ID")
	.describe("32-bit Steam Account ID (example: 1146009051)");

const MatchTakeSchema = z.number()
	.int()
	.min(1, "Must request at least 1 match")
	.max(20, "Maximum 20 matches allowed")
	.default(10)
	.describe("Number of matches to retrieve");

const RankBracketSchema = z.enum([
	"HERALD", "GUARDIAN", "CRUSADER", "ARCHON", 
	"LEGEND", "ANCIENT", "DIVINE", "IMMORTAL"
]).describe("Dota 2 rank bracket (example: DIVINE)");

const HeroIdSchema = z.number()
	.int()
	.min(1, "Invalid hero ID")
	.max(150, "Invalid hero ID")
	.describe("Dota 2 hero ID (example: 14 for Pudge)");

const MatchIdSchema = z.number()
	.int()
	.positive()
	.min(1000000000, "Invalid match ID")
	.max(9999999999, "Invalid match ID")
	.describe("Dota 2 match ID (example: 7891234567)");

const RoleSchema = z.enum([
	"CORE", "SUPPORT", "OFFLANE", "MID", "SAFE_LANE", "ALL"
]).default("ALL").describe("Player role (example: CORE)");

const HeroTakeSchema = z.number()
	.int()
	.min(1, "Must request at least 1 hero")
	.max(50, "Maximum 50 heroes allowed")
	.default(10)
	.describe("Number of heroes to retrieve");

// Domain-specific tools with strict schemas
server.tool(
	"dota.player.profile",
	"Get player's Dota 2 profile including rank, total matches, winrate and recent activity. Use steamAccountId 1146009051 for testing. Returns player's current rank, IMP score, total wins/matches, and monthly activity statistics.",
	{
		steamAccountId: SteamAccountSchema
	},
	async (input) => {
		try {
			const validatedInput = validateToolInput("dota.player.profile", input);
			const { steamAccountId } = validatedInput;
			
			const query = `
				query PlayerProfile($steamAccountId: Long!) {
					player(steamAccountId: $steamAccountId) {
						steamAccount {
							id
							name
							profileUri
							avatar
						}
						ranks {
							rank
							seasonRankId
						}
						winCount
						matchCount
						imp
						firstMatchDate
						lastMatchDate
					}
				}
			`;

			const data = await executeGraphQL(query, { steamAccountId });
			return createSuccessResponse(data);
		} catch (error) {
			return createErrorResponse("dota.player.profile", error);
		}
	}
);

server.tool(
	"dota.player.matches",
	"Get player's recent Dota 2 matches with detailed statistics: win/loss, heroes played, KDA, GPM, XPM, damage. Example: {steamAccountId: 1146009051, take: 5} returns last 5 matches with complete performance data.",
	{
		steamAccountId: SteamAccountSchema,
		take: MatchTakeSchema
	},
	async ({ steamAccountId, take }) => {
		const query = `
			query PlayerMatches($steamAccountId: Long!, $request: PlayerMatchesRequestType!) {
				player(steamAccountId: $steamAccountId) {
					matches(request: $request) {
						id
						didRadiantWin
						durationSeconds
						startDateTime
						rank
						players {
							steamAccountId
							isRadiant
							heroId
							kills
							deaths
							assists
							networth
							level
							heroDamage
							towerDamage
						}
					}
				}
			}
		`;

		try {
			const data = await executeGraphQL(query, { 
				steamAccountId, 
				request: { take: Math.min(take, 20) }
			});
			return createSuccessResponse(data);
		} catch (error) {
			return createErrorResponse("dota.player.matches", error);
		}
	}
);

server.tool(
	"dota.player.heroes",
	"Get player's hero performance statistics: which heroes they play most, winrates, average KDA, GPM/XPM per hero. Example: {steamAccountId: 1146009051, take: 10} returns top 10 most played heroes with complete stats.",
	{
		steamAccountId: SteamAccountSchema,
		take: HeroTakeSchema
	},
	async ({ steamAccountId, take }) => {
		const query = `
			query PlayerHeroes($steamAccountId: Long!, $request: PlayerHeroPerformanceMatchesRequestType!) {
				player(steamAccountId: $steamAccountId) {
					heroesPerformance(request: $request) {
						heroId
						matchCount
						winCount
						avgKills
						avgDeaths
						avgAssists
						goldPerMinute
						experiencePerMinute
						lastPlayedDateTime
					}
				}
			}
		`;

		try {
			const data = await executeGraphQL(query, { 
				steamAccountId, 
				request: { take: Math.min(take, 50) }
			});
			return createSuccessResponse(data);
		} catch (error) {
			return createErrorResponse("dota.player.heroes", error);
		}
	}
);

server.tool(
	"dota.match.summary",
	"Get basic match information: which team won (Radiant/Dire), match duration, game mode, average rank, start/end time. Example: {matchId: 7891234567} returns complete match overview without player details.",
	{
		matchId: MatchIdSchema
	},
	async ({ matchId }) => {
		const query = `
			query MatchSummary($matchId: Long!) {
				match(id: $matchId) {
					id
					didRadiantWin
					durationSeconds
					startDateTime
					endDateTime
					gameMode
					lobbyType
					rank
					series {
						id
						type
					}
					league {
						id
						displayName
					}
					radiantTeam {
						id
						name
					}
					direTeam {
						id
						name
					}
				}
			}
		`;

		try {
			const data = await executeGraphQL(query, { matchId });
			return createSuccessResponse(data);
		} catch (error) {
			return createErrorResponse("dota.match.summary", error);
		}
	}
);

server.tool(
	"dota.match.players",
	"Get detailed player statistics for a match",
	{
		matchId: z.number().describe("Match ID")
	},
	async ({ matchId }) => {
		const query = `
			query MatchPlayers($matchId: Long!) {
				match(id: $matchId) {
					players {
						steamAccountId
						steamAccount {
							name
							profileUri
						}
						isRadiant
						heroId
						position
						lane
						kills
						deaths
						assists
						networth
						goldPerMinute
						experiencePerMinute
						level
						heroDamage
						towerDamage
						heroHealing
						lastHits
						denies
						items {
							itemId
							timeCreated
						}
					}
				}
			}
		`;

		try {
			const data = await executeGraphQL(query, { matchId });
			return {
				content: [{
					type: "text",
					text: JSON.stringify(data, null, 2)
				}]
			};
		} catch (error) {
			return {
				isError: true,
				content: [{
					type: "text",
					text: `Match players error: ${error}`
				}]
			};
		}
	}
);

server.tool(
	"dota.meta.heroStats",
	"Get current meta hero statistics with win rates and pick rates",
	{
		patch: z.string().optional().describe("Game patch (e.g., '7.35')"),
		bracket: z.enum(["HERALD", "GUARDIAN", "CRUSADER", "ARCHON", "LEGEND", "ANCIENT", "DIVINE", "IMMORTAL"]).optional()
	},
	async ({ patch, bracket }) => {
		const query = `
			query HeroStats($patch: String, $bracket: RankBracket) {
				heroStats {
					heroId
					matchCount
					winCount
					winRate
					pickRate
					banRate
				}
			}
		`;

		try {
			const data = await executeGraphQL(query, { patch, bracket });
			return {
				content: [{
					type: "text",
					text: JSON.stringify(data, null, 2)
				}]
			};
		} catch (error) {
			return {
				isError: true,
				content: [{
					type: "text",
					text: `Hero stats error: ${error}`
				}]
			};
		}
	}
);

// P0 MUST HAVE: Meta counters and synergies
server.tool(
	"dota.meta.counters",
	"Get hero counters and weak matchups with win rates and sample sizes",
	{
		heroId: z.number().describe("Hero ID to analyze counters for"),
		bracket: z.enum(["HERALD", "GUARDIAN", "CRUSADER", "ARCHON", "LEGEND", "ANCIENT", "DIVINE", "IMMORTAL"]).optional().describe("Rank bracket filter"),
		patch: z.string().optional().describe("Patch version (defaults to current)")
	},
	async ({ heroId, bracket, patch }) => {
		const query = `
			query HeroCounters($heroId: Short!, $bracket: RankBracket, $patch: String) {
				heroStats(bracket: [$bracket], gameModeIds: [RANKED]) {
					heroVsHeroMatchup(heroId: $heroId, take: 20) {
						vs {
							heroId2
							hero {
								id
								displayName
								aliases
							}
							matchCount
							winCount
							winRate
							synergy
						}
						with {
							heroId2
							hero {
								id
								displayName
								aliases
							}
							matchCount
							winCount
							winRate
							synergy
						}
					}
				}
			}
		`;

		try {
			const data = await executeGraphQL(query, { heroId, bracket, patch });
			
			// Process and rank counters
			const counters = data.heroStats?.heroVsHeroMatchup?.vs || [];
			const strongCounters = counters
				.filter(m => m.matchCount >= 100) // Minimum sample size
				.sort((a, b) => a.winRate - b.winRate) // Worst matchups first
				.slice(0, 10);

			const analysis = {
				heroId,
				bracket: bracket || "ALL",
				strongestCounters: strongCounters.map(c => ({
					heroName: c.hero.displayName,
					heroId: c.heroId2,
					winRate: c.winRate,
					matchCount: c.matchCount,
					disadvantage: `${((1 - c.winRate) * 100).toFixed(1)}%`
				})),
				rawData: data
			};

			return {
				content: [{
					type: "text",
					text: JSON.stringify(analysis, null, 2)
				}]
			};
		} catch (error) {
			return {
				isError: true,
				content: [{
					type: "text",
					text: `Hero counters error: ${error}`
				}]
			};
		}
	}
);

server.tool(
	"dota.meta.synergy",
	"Get hero synergies and best teammates with win rates",
	{
		heroId: z.number().describe("Hero ID to find synergies for"),
		withHeroId: z.number().optional().describe("Specific teammate hero ID to check synergy with"),
		bracket: z.enum(["HERALD", "GUARDIAN", "CRUSADER", "ARCHON", "LEGEND", "ANCIENT", "DIVINE", "IMMORTAL"]).optional().describe("Rank bracket filter"),
		patch: z.string().optional().describe("Patch version (defaults to current)")
	},
	async ({ heroId, withHeroId, bracket, patch }) => {
		const query = `
			query HeroSynergy($heroId: Short!, $bracket: RankBracket, $patch: String) {
				heroStats(bracket: [$bracket], gameModeIds: [RANKED]) {
					heroVsHeroMatchup(heroId: $heroId, take: 20) {
						with {
							heroId2
							hero {
								id
								displayName
								aliases
							}
							matchCount
							winCount
							winRate
							synergy
						}
					}
				}
			}
		`;

		try {
			const data = await executeGraphQL(query, { heroId, bracket, patch });
			
			let synergies = data.heroStats?.heroVsHeroMatchup?.with || [];
			
			// Filter by specific hero if requested
			if (withHeroId) {
				synergies = synergies.filter(s => s.heroId2 === withHeroId);
			}

			// Process and rank synergies
			const bestSynergies = synergies
				.filter(s => s.matchCount >= 100) // Minimum sample size
				.sort((a, b) => b.winRate - a.winRate) // Best synergies first
				.slice(0, 10);

			const analysis = {
				heroId,
				withHeroId: withHeroId || null,
				bracket: bracket || "ALL",
				bestSynergies: bestSynergies.map(s => ({
					heroName: s.hero.displayName,
					heroId: s.heroId2,
					winRate: s.winRate,
					matchCount: s.matchCount,
					advantage: `${(s.winRate * 100).toFixed(1)}%`,
					synergyScore: s.synergy
				})),
				rawData: data
			};

			return {
				content: [{
					type: "text",
					text: JSON.stringify(analysis, null, 2)
				}]
			};
		} catch (error) {
			return {
				isError: true,
				content: [{
					type: "text",
					text: `Hero synergy error: ${error}`
				}]
			};
		}
	}
);

// P0 MUST HAVE: Player benchmarks by rank/position
server.tool(
	"dota.player.benchmarks",
	"Get player performance benchmarks vs rank averages (GPM/XPM/KDA/LH@10/damage)",
	{
		steamAccountId: z.number().describe("32-bit Steam Account ID"),
		role: z.enum(["CORE", "SUPPORT", "OFFLANE", "MID", "SAFE_LANE"]).optional().describe("Role filter for benchmarks"),
		bracket: z.enum(["HERALD", "GUARDIAN", "CRUSADER", "ARCHON", "LEGEND", "ANCIENT", "DIVINE", "IMMORTAL"]).optional().describe("Rank bracket for comparison"),
		take: z.number().default(20).describe("Number of recent matches to analyze")
	},
	async ({ steamAccountId, role, bracket, take }) => {
		const query = `
			query PlayerBenchmarks($steamAccountId: Long!, $role: MatchPlayerRoleType, $bracket: RankBracket, $take: Int!) {
				player(steamAccountId: $steamAccountId) {
					steamAccount {
						name
						profileUri
					}
					matches(take: $take, request: {
						roleIds: [$role]
						bracketIds: [$bracket]
					}) {
						id
						durationSeconds
						didRadiantWin
						rank
						players(steamAccountId: $steamAccountId) {
							steamAccountId
							heroId
							hero {
								displayName
							}
							role
							isRadiant
							kills
							deaths
							assists
							goldPerMinute
							experiencePerMinute
							networth
							lastHits
							denies
							heroDamage
							towerDamage
							heroHealing
							level
							numLastHits10
							numDenies10
							goldPerMinute10
							experiencePerMinute10
							imp
						}
					}
					heroesPerformance(take: 50, request: {
						roleIds: [$role]
						bracketIds: [$bracket]
					}) {
						heroId
						hero {
							displayName
						}
						matchCount
						winCount
						avgKills
						avgDeaths
						avgAssists
						avgGoldPerMinute
						avgExperiencePerMinute
						avgImp
					}
				}
			}
		`;

		try {
			const data = await executeGraphQL(query, { steamAccountId, role, bracket, take });
			
			if (!data.player) {
				return {
					isError: true,
					content: [{
						type: "text",
						text: `Player not found. Check Steam Account ID: ${steamAccountId}`
					}]
				};
			}

			const matches = data.player.matches || [];
			const playerMatches = matches.map(m => m.players[0]).filter(p => p);

			if (playerMatches.length === 0) {
				return {
					content: [{
						type: "text",
						text: `No matches found for role: ${role}, bracket: ${bracket}`
					}]
				};
			}

			// Calculate player averages
			const playerAvg = {
				gpm: playerMatches.reduce((sum, p) => sum + p.goldPerMinute, 0) / playerMatches.length,
				xpm: playerMatches.reduce((sum, p) => sum + p.experiencePerMinute, 0) / playerMatches.length,
				kda: playerMatches.reduce((sum, p) => sum + (p.kills + p.assists) / Math.max(p.deaths, 1), 0) / playerMatches.length,
				lh10: playerMatches.reduce((sum, p) => sum + (p.numLastHits10 || 0), 0) / playerMatches.length,
				heroDamage: playerMatches.reduce((sum, p) => sum + p.heroDamage, 0) / playerMatches.length,
				imp: playerMatches.reduce((sum, p) => sum + (p.imp || 0), 0) / playerMatches.length,
				winRate: playerMatches.filter(p => 
					(p.isRadiant && matches.find(m => m.players[0].steamAccountId === p.steamAccountId)?.didRadiantWin) ||
					(!p.isRadiant && !matches.find(m => m.players[0].steamAccountId === p.steamAccountId)?.didRadiantWin)
				).length / playerMatches.length
			};

			// Calculate percentiles (simplified - would need larger dataset for accurate percentiles)
			const benchmarks = {
				steamAccountId,
				playerName: data.player.steamAccount?.name || "Unknown",
				role: role || "ALL",
				bracket: bracket || "ALL",
				matchesAnalyzed: playerMatches.length,
				
				performance: {
					gpm: {
						value: Math.round(playerAvg.gpm),
						percentile: playerAvg.gpm > 400 ? "75th+" : playerAvg.gpm > 300 ? "50th" : "25th",
						rating: playerAvg.gpm > 500 ? "Excellent" : playerAvg.gpm > 400 ? "Good" : "Below Average"
					},
					xpm: {
						value: Math.round(playerAvg.xpm),
						percentile: playerAvg.xpm > 500 ? "75th+" : playerAvg.xpm > 400 ? "50th" : "25th",
						rating: playerAvg.xpm > 600 ? "Excellent" : playerAvg.xpm > 500 ? "Good" : "Below Average"
					},
					kda: {
						value: Number(playerAvg.kda.toFixed(2)),
						percentile: playerAvg.kda > 3 ? "75th+" : playerAvg.kda > 2 ? "50th" : "25th",
						rating: playerAvg.kda > 4 ? "Excellent" : playerAvg.kda > 2.5 ? "Good" : "Below Average"
					},
					laning: {
						lh10: Math.round(playerAvg.lh10),
						percentile: playerAvg.lh10 > 50 ? "75th+" : playerAvg.lh10 > 35 ? "50th" : "25th",
						rating: playerAvg.lh10 > 60 ? "Excellent" : playerAvg.lh10 > 45 ? "Good" : "Below Average"
					},
					impact: {
						heroDamage: Math.round(playerAvg.heroDamage),
						imp: Number(playerAvg.imp.toFixed(1)),
						winRate: Number((playerAvg.winRate * 100).toFixed(1))
					}
				},

				actionableAdvice: [
					playerAvg.gpm < 400 ? "Focus on farming efficiency - aim for 400+ GPM" : null,
					playerAvg.lh10 < 45 ? "Practice last hitting - target 50+ LH at 10 min" : null,
					playerAvg.kda < 2.5 ? "Reduce deaths - play safer in mid-game" : null,
					playerAvg.imp < 0 ? "Work on game impact - focus on objectives and teamfights" : null
				].filter(advice => advice !== null),

				recentMatches: playerMatches.slice(0, 5).map(p => ({
					heroName: p.hero.displayName,
					gpm: p.goldPerMinute,
					xpm: p.experiencePerMinute,
					kda: `${p.kills}/${p.deaths}/${p.assists}`,
					lh10: p.numLastHits10,
					imp: p.imp
				}))
			};

			return {
				content: [{
					type: "text",
					text: JSON.stringify(benchmarks, null, 2)
				}]
			};
		} catch (error) {
			return {
				isError: true,
				content: [{
					type: "text",
					text: `Player benchmarks error: ${error}`
				}]
			};
		}
	}
);

// P0 MUST HAVE: Item timings and power spikes
server.tool(
	"dota.match.itemTimings",
	"Analyze item purchase timings vs expected timings for rank/hero",
	{
		matchId: z.number().describe("Match ID to analyze"),
		steamAccountId: z.number().optional().describe("Focus on specific player")
	},
	async ({ matchId, steamAccountId }) => {
		const query = `
			query MatchItemTimings($matchId: Long!, $steamAccountId: Long) {
				match(id: $matchId) {
					id
					durationSeconds
					didRadiantWin
					gameMode
					rank
					players ${steamAccountId ? `(steamAccountId: $steamAccountId)` : ''} {
						steamAccountId
						steamAccount {
							name
						}
						heroId
						hero {
							displayName
						}
						role
						isRadiant
						networth
						goldPerMinute
						level
						items {
							itemId
							item {
								id
								displayName
								cost
							}
							timeCreated
						}
						abilities {
							abilityId
							time
							level
						}
						stats {
							networthPerMinute {
								time
								networth
							}
							experiencePerMinute {
								time
								experience
							}
						}
					}
				}
			}
		`;

		try {
			const data = await executeGraphQL(query, { matchId, steamAccountId });
			
			if (!data.match) {
				return {
					isError: true,
					content: [{
						type: "text",
						text: `Match not found: ${matchId}`
					}]
				};
			}

			const match = data.match;
			const players = match.players || [];

			const analysis = players.map(player => {
				const items = player.items || [];
				
				// Key items to track with expected timings (in seconds)
				const keyItems = {
					"Blink Dagger": { expectedTime: 780, itemId: 1 }, // ~13 min
					"Black King Bar": { expectedTime: 1200, itemId: 116 }, // ~20 min
					"Aghanim's Scepter": { expectedTime: 1500, itemId: 108 }, // ~25 min
					"Radiance": { expectedTime: 900, itemId: 137 }, // ~15 min
					"Divine Rapier": { expectedTime: 2400, itemId: 133 }, // ~40 min
					"Boots of Speed": { expectedTime: 300, itemId: 29 }, // ~5 min
					"Power Treads": { expectedTime: 600, itemId: 63 }, // ~10 min
					"Phase Boots": { expectedTime: 480, itemId: 50 } // ~8 min
				};

				const itemTimings = items
					.filter(item => keyItems[item.item?.displayName])
					.map(item => {
						const expected = keyItems[item.item.displayName];
						const actualMinutes = Math.floor(item.timeCreated / 60);
						const expectedMinutes = Math.floor(expected.expectedTime / 60);
						const timingDiff = item.timeCreated - expected.expectedTime;
						
						return {
							itemName: item.item.displayName,
							actualTime: `${Math.floor(actualMinutes / 60)}:${String(actualMinutes % 60).padStart(2, '0')}`,
							expectedTime: `${Math.floor(expectedMinutes / 60)}:${String(expectedMinutes % 60).padStart(2, '0')}`,
							timingScore: timingDiff < -120 ? "Excellent" : 
										timingDiff < 60 ? "Good" : 
										timingDiff < 180 ? "Average" : "Late",
							differenceSeconds: timingDiff,
							cost: item.item.cost
						};
					});

				// Calculate farming efficiency
				const networthAt10 = player.stats?.networthPerMinute?.find(n => n.time >= 600)?.networth || 0;
				const networthAt20 = player.stats?.networthPerMinute?.find(n => n.time >= 1200)?.networth || 0;
				
				const farmingEfficiency = {
					networthAt10Min: networthAt10,
					networthAt20Min: networthAt20,
					gpmRating: player.goldPerMinute > 500 ? "Excellent" : 
							  player.goldPerMinute > 400 ? "Good" : 
							  player.goldPerMinute > 300 ? "Average" : "Poor"
				};

				return {
					playerName: player.steamAccount?.name || "Unknown",
					heroName: player.hero.displayName,
					role: player.role,
					steamAccountId: player.steamAccountId,
					itemTimings,
					farmingEfficiency,
					powerSpikes: [
						{
							timing: "Early Game (0-15 min)",
							items: itemTimings.filter(t => t.differenceSeconds < 900),
							recommendation: networthAt10 < 3000 ? "Focus on last hitting and farming patterns" : "Good early game farm"
						},
						{
							timing: "Mid Game (15-30 min)",
							items: itemTimings.filter(t => t.differenceSeconds >= 900 && t.differenceSeconds < 1800),
							recommendation: itemTimings.some(t => t.itemName.includes("Blink") && t.timingScore === "Late") 
								? "Work on farming efficiency for core items" 
								: "Good item progression"
						}
					],
					actionableAdvice: [
						networthAt10 < 2500 ? "Improve early game farming - aim for 2500+ networth at 10 min" : null,
						itemTimings.some(t => t.timingScore === "Late") ? "Practice item timing - some key items were late" : null,
						player.goldPerMinute < 300 ? "Focus on farming efficiency and map awareness" : null
					].filter(advice => advice !== null)
				};
			});

			return {
				content: [{
					type: "text",
					text: JSON.stringify({
						matchId,
						matchDuration: `${Math.floor(match.durationSeconds / 60)} minutes`,
						rank: match.rank,
						playersAnalyzed: analysis.length,
						analysis
					}, null, 2)
				}]
			};
		} catch (error) {
			return {
				isError: true,
				content: [{
					type: "text",
					text: `Item timings error: ${error}`
				}]
			};
		}
	}
);

server.tool(
	"dota.player.itemTimings",
	"Get player's item timing patterns across recent matches",
	{
		steamAccountId: z.number().describe("32-bit Steam Account ID"),
		take: z.number().default(10).describe("Number of recent matches to analyze"),
		heroId: z.number().optional().describe("Filter by specific hero")
	},
	async ({ steamAccountId, take, heroId }) => {
		const query = `
			query PlayerItemTimings($steamAccountId: Long!, $take: Int!, $heroId: Short) {
				player(steamAccountId: $steamAccountId) {
					steamAccount {
						name
						profileUri
					}
					matches(take: $take, request: {
						heroIds: [$heroId]
					}) {
						id
						durationSeconds
						didRadiantWin
						rank
						players(steamAccountId: $steamAccountId) {
							steamAccountId
							heroId
							hero {
								displayName
							}
							role
							isRadiant
							goldPerMinute
							items {
								itemId
								item {
									id
									displayName
									cost
								}
								timeCreated
							}
						}
					}
				}
			}
		`;

		try {
			const data = await executeGraphQL(query, { steamAccountId, take, heroId });
			
			if (!data.player) {
				return {
					isError: true,
					content: [{
						type: "text",
						text: `Player not found: ${steamAccountId}`
					}]
				};
			}

			const matches = data.player.matches || [];
			const allItems = [];

			// Collect all item purchases across matches
			matches.forEach(match => {
				const player = match.players[0];
				if (player && player.items) {
					player.items.forEach(item => {
						allItems.push({
							...item,
							matchId: match.id,
							heroName: player.hero.displayName,
							gpm: player.goldPerMinute,
							matchDuration: match.durationSeconds
						});
					});
				}
			});

			// Analyze patterns for key items
			const keyItemNames = ["Blink Dagger", "Black King Bar", "Aghanim's Scepter", "Radiance", "Divine Rapier"];
			const itemPatterns = {};

			keyItemNames.forEach(itemName => {
				const itemPurchases = allItems.filter(item => item.item?.displayName === itemName);
				if (itemPurchases.length > 0) {
					const timings = itemPurchases.map(p => p.timeCreated);
					const avgTiming = timings.reduce((sum, t) => sum + t, 0) / timings.length;
					
					itemPatterns[itemName] = {
						purchaseCount: itemPurchases.length,
						averageTimingMinutes: Math.round(avgTiming / 60),
						bestTiming: Math.min(...timings),
						worstTiming: Math.max(...timings),
						consistency: timings.length > 1 ? 
							Math.round(Math.sqrt(timings.reduce((sum, t) => sum + Math.pow(t - avgTiming, 2), 0) / timings.length) / 60) 
							: 0,
						heroes: [...new Set(itemPurchases.map(p => p.heroName))]
					};
				}
			});

			const analysis = {
				steamAccountId,
				playerName: data.player.steamAccount?.name || "Unknown",
				matchesAnalyzed: matches.length,
				heroFilter: heroId ? matches[0]?.players[0]?.hero?.displayName : "All Heroes",
				
				itemPatterns,
				
				overallInsights: {
					averageGPM: Math.round(matches.reduce((sum, m) => sum + m.players[0].goldPerMinute, 0) / matches.length),
					mostBuiltItems: Object.entries(itemPatterns)
						.sort((a, b) => b[1].purchaseCount - a[1].purchaseCount)
						.slice(0, 3)
						.map(([name, data]) => ({ name, count: data.purchaseCount })),
					recommendations: [
						Object.values(itemPatterns).some(p => p.consistency > 3) ? "Work on consistent item timings" : null,
						matches.some(m => m.players[0].goldPerMinute < 350) ? "Focus on farming efficiency" : null
					].filter(r => r !== null)
				}
			};

			return {
				content: [{
					type: "text",
					text: JSON.stringify(analysis, null, 2)
				}]
			};
		} catch (error) {
			return {
				isError: true,
				content: [{
					type: "text",
					text: `Player item timings error: ${error}`
				}]
			};
		}
	}
);

// P1 VERY DESIRABLE: Laning analysis and mistakes
server.tool(
	"dota.analysis.laning",
	"Analyze laning phase performance and early game metrics",
	{
		matchId: z.number().optional().describe("Specific match to analyze"),
		steamAccountId: z.number().describe("32-bit Steam Account ID"),
		take: z.number().default(10).describe("Number of recent matches if no specific match")
	},
	async ({ matchId, steamAccountId, take }) => {
		const query = matchId ? `
			query LaningAnalysisMatch($matchId: Long!, $steamAccountId: Long!) {
				match(id: $matchId) {
					id
					durationSeconds
					players(steamAccountId: $steamAccountId) {
						steamAccountId
						heroId
						hero { displayName }
						role
						lane
						isRadiant
						kills
						deaths
						assists
						lastHits
						denies
						goldPerMinute
						experiencePerMinute
						heroDamage
						towerDamage
						numLastHits10
						numDenies10
						goldPerMinute10
						experiencePerMinute10
						level
						items {
							itemId
							item { displayName cost }
							timeCreated
						}
						stats {
							networthPerMinute { time networth }
							experiencePerMinute { time experience }
							lastHitsPerMinute { time lastHits }
						}
					}
				}
			}
		` : `
			query LaningAnalysisPlayer($steamAccountId: Long!, $take: Int!) {
				player(steamAccountId: $steamAccountId) {
					steamAccount { name }
					matches(take: $take) {
						id
						durationSeconds
						didRadiantWin
						players(steamAccountId: $steamAccountId) {
							steamAccountId
							heroId
							hero { displayName }
							role
							lane
							isRadiant
							kills
							deaths
							assists
							lastHits
							denies
							goldPerMinute
							experiencePerMinute
							numLastHits10
							numDenies10
							goldPerMinute10
							experiencePerMinute10
							level
							items {
								itemId
								item { displayName cost }
								timeCreated
							}
						}
					}
				}
			}
		`;

		try {
			const data = await executeGraphQL(query, matchId ? { matchId, steamAccountId } : { steamAccountId, take });
			
			let players = [];
			if (matchId) {
				if (!data.match) {
					return { isError: true, content: [{ type: "text", text: `Match not found: ${matchId}` }] };
				}
				players = data.match.players || [];
			} else {
				if (!data.player) {
					return { isError: true, content: [{ type: "text", text: `Player not found: ${steamAccountId}` }] };
				}
				players = (data.player.matches || []).map(m => m.players[0]).filter(p => p);
			}

			if (players.length === 0) {
				return { content: [{ type: "text", text: "No match data found" }] };
			}

			// Analyze laning performance
			const laningAnalysis = players.map(player => {
				const lh10 = player.numLastHits10 || 0;
				const denies10 = player.numDenies10 || 0;
				const gpm10 = player.goldPerMinute10 || 0;
				const xpm10 = player.experiencePerMinute10 || 0;
				
				// Get early items (first 10 minutes)
				const earlyItems = (player.items || [])
					.filter(item => item.timeCreated <= 600)
					.sort((a, b) => a.timeCreated - b.timeCreated);

				// Calculate laning efficiency
				const laningEfficiency = {
					lastHitting: lh10 >= 60 ? "Excellent" : lh10 >= 45 ? "Good" : lh10 >= 30 ? "Average" : "Poor",
					denying: denies10 >= 15 ? "Excellent" : denies10 >= 10 ? "Good" : denies10 >= 5 ? "Average" : "Poor",
					farming: gpm10 >= 400 ? "Excellent" : gpm10 >= 300 ? "Good" : gpm10 >= 200 ? "Average" : "Poor",
					experience: xpm10 >= 400 ? "Excellent" : xpm10 >= 300 ? "Good" : xpm10 >= 200 ? "Average" : "Poor"
				};

				// Identify potential mistakes
				const mistakes = [];
				if (lh10 < 30) mistakes.push("Very low last hits - practice last hitting mechanics");
				if (denies10 < 5) mistakes.push("No denies - missing lane control opportunities");
				if (gpm10 < 200) mistakes.push("Extremely low GPM - fundamental farming issues");
				if (earlyItems.length < 2) mistakes.push("Very few early items - poor farming/starting items");
				
				// Check for early deaths (first 10 minutes)
				const earlyDeaths = player.deaths > 0 && player.kills + player.assists < player.deaths ? 
					Math.min(player.deaths, 3) : 0; // Estimate early deaths
				
				if (earlyDeaths > 2) {
					mistakes.push("Multiple early deaths - work on positioning and map awareness");
				}

				// Item timing analysis for laning phase
				const itemTimingAnalysis = earlyItems.map(item => {
					const timing = Math.floor(item.timeCreated / 60);
					let expected = 0;
					let category = "";
					
					if (item.item.displayName === "Boots of Speed") {
						expected = 5;
						category = "Mobility";
					} else if (item.item.displayName === "Magic Wand") {
						expected = 7;
						category = "Sustainability";
					} else if (item.item.cost < 500) {
						expected = 3;
						category = "Early Game";
					}

					return {
						item: item.item.displayName,
						actualTiming: `${timing}:${String(item.timeCreated % 60).padStart(2, '0')}`,
						expectedTiming: expected > 0 ? `~${expected}:00` : "Variable",
						category,
						timingScore: expected > 0 ? 
							(timing <= expected ? "Good" : timing <= expected + 2 ? "Average" : "Late") : 
							"N/A"
					};
				});

				return {
					heroName: player.hero.displayName,
					role: player.role,
					lane: player.lane,
					
					laningMetrics: {
						lastHits10: lh10,
						denies10: denies10,
						gpm10: gpm10,
						xpm10: xpm10,
						csPerMin: Number((lh10 / 10).toFixed(1)),
						efficiency: laningEfficiency
					},
					
					itemTimingAnalysis,
					
					identifiedMistakes: mistakes,
					
					laningGrade: {
						overall: Object.values(laningEfficiency).filter(rating => rating === "Excellent").length >= 3 ? "A" :
								Object.values(laningEfficiency).filter(rating => ["Excellent", "Good"].includes(rating)).length >= 2 ? "B" :
								Object.values(laningEfficiency).filter(rating => rating !== "Poor").length >= 2 ? "C" : "D",
						strengths: Object.entries(laningEfficiency).filter(([_, rating]) => rating === "Excellent").map(([metric, _]) => metric),
						weaknesses: Object.entries(laningEfficiency).filter(([_, rating]) => rating === "Poor").map(([metric, _]) => metric)
					},
					
					recommendations: [
						lh10 < 50 ? `Practice last hitting - aim for 50+ LH@10 (currently ${lh10})` : null,
						denies10 < 10 ? `Focus on denying enemy creeps - target 10+ denies@10 (currently ${denies10})` : null,
						gpm10 < 300 ? `Improve farming patterns - aim for 300+ GPM@10 (currently ${gpm10})` : null,
						earlyItems.length < 3 ? "Build more early game items for laning sustainability" : null
					].filter(rec => rec !== null)
				};
			});

			const summary = matchId ? 
				{ matchId, analysis: laningAnalysis[0] } :
				{
					steamAccountId,
					playerName: data.player?.steamAccount?.name || "Unknown",
					matchesAnalyzed: laningAnalysis.length,
					averageMetrics: {
						avgLH10: Math.round(laningAnalysis.reduce((sum, p) => sum + p.laningMetrics.lastHits10, 0) / laningAnalysis.length),
						avgDenies10: Math.round(laningAnalysis.reduce((sum, p) => sum + p.laningMetrics.denies10, 0) / laningAnalysis.length),
						avgGPM10: Math.round(laningAnalysis.reduce((sum, p) => sum + p.laningMetrics.gpm10, 0) / laningAnalysis.length),
						consistencyIssues: laningAnalysis.filter(p => p.laningGrade.overall === "D").length
					},
					detailedAnalysis: laningAnalysis.slice(0, 3) // Show top 3 matches for detail
				};

			return {
				content: [{
					type: "text",
					text: JSON.stringify(summary, null, 2)
				}]
			};
		} catch (error) {
			return {
				isError: true,
				content: [{
					type: "text",
					text: `Laning analysis error: ${error}`
				}]
			};
		}
	}
);

// P1 VERY DESIRABLE: Draft assistance
server.tool(
	"dota.draft.assist",
	"Professional draft assistance with counter-picks and synergies",
	{
		ourPicks: z.array(z.number()).default([]).describe("Our team's picked hero IDs"),
		enemyPicks: z.array(z.number()).default([]).describe("Enemy team's picked hero IDs"),
		availableHeroes: z.array(z.number()).optional().describe("Available hero pool (if restricted)"),
		bracket: z.enum(["HERALD", "GUARDIAN", "CRUSADER", "ARCHON", "LEGEND", "ANCIENT", "DIVINE", "IMMORTAL"]).optional().describe("Target rank bracket"),
		patch: z.string().optional().describe("Patch version (defaults to current)"),
		phase: z.enum(["PICK", "BAN", "COMPLETE"]).default("PICK").describe("Current draft phase")
	},
	async ({ ourPicks, enemyPicks, availableHeroes, bracket, patch, phase }) => {
		try {
			// For each enemy pick, find counters
			const counterAnalysis = await Promise.all(
				enemyPicks.map(async (heroId) => {
					const query = `
						query CounterAnalysis($heroId: Short!, $bracket: RankBracket) {
							heroStats(bracket: [$bracket], gameModeIds: [RANKED]) {
								heroVsHeroMatchup(heroId: $heroId, take: 10) {
									vs {
										heroId2
										hero { id displayName }
										matchCount
										winRate
									}
								}
							}
						}
					`;
					
					const data = await executeGraphQL(query, { heroId, bracket });
					const counters = data.heroStats?.heroVsHeroMatchup?.vs || [];
					
					return {
						enemyHeroId: heroId,
						bestCounters: counters
							.filter(c => c.matchCount >= 100)
							.sort((a, b) => a.winRate - b.winRate)
							.slice(0, 5)
							.map(c => ({
								heroId: c.heroId2,
								heroName: c.hero.displayName,
								winRateAgainst: (c.winRate * 100).toFixed(1) + "%",
								advantage: ((1 - c.winRate) * 100).toFixed(1) + "%",
								matchCount: c.matchCount
							}))
					};
				})
			);

			// For our current picks, find synergies
			const synergyAnalysis = await Promise.all(
				ourPicks.map(async (heroId) => {
					const query = `
						query SynergyAnalysis($heroId: Short!, $bracket: RankBracket) {
							heroStats(bracket: [$bracket], gameModeIds: [RANKED]) {
								heroVsHeroMatchup(heroId: $heroId, take: 10) {
									with {
										heroId2
										hero { id displayName }
										matchCount
										winRate
									}
								}
							}
						}
					`;
					
					const data = await executeGraphQL(query, { heroId, bracket });
					const synergies = data.heroStats?.heroVsHeroMatchup?.with || [];
					
					return {
						ourHeroId: heroId,
						bestSynergies: synergies
							.filter(s => s.matchCount >= 100)
							.filter(s => !ourPicks.includes(s.heroId2)) // Exclude already picked heroes
							.sort((a, b) => b.winRate - a.winRate)
							.slice(0, 5)
							.map(s => ({
								heroId: s.heroId2,
								heroName: s.hero.displayName,
								winRateWith: (s.winRate * 100).toFixed(1) + "%",
								matchCount: s.matchCount
							}))
					};
				})
			);

			// Combine recommendations
			const allCounterSuggestions = new Map();
			const allSynergySuggestions = new Map();

			// Aggregate counter suggestions
			counterAnalysis.forEach(analysis => {
				analysis.bestCounters.forEach(counter => {
					if (!allCounterSuggestions.has(counter.heroId)) {
						allCounterSuggestions.set(counter.heroId, {
							...counter,
							countersHeroes: [analysis.enemyHeroId],
							totalAdvantage: parseFloat(counter.advantage)
						});
					} else {
						const existing = allCounterSuggestions.get(counter.heroId);
						existing.countersHeroes.push(analysis.enemyHeroId);
						existing.totalAdvantage += parseFloat(counter.advantage);
					}
				});
			});

			// Aggregate synergy suggestions
			synergyAnalysis.forEach(analysis => {
				analysis.bestSynergies.forEach(synergy => {
					if (!allSynergySuggestions.has(synergy.heroId)) {
						allSynergySuggestions.set(synergy.heroId, {
							...synergy,
							synergizesWith: [analysis.ourHeroId],
							avgWinRate: parseFloat(synergy.winRateWith)
						});
					} else {
						const existing = allSynergySuggestions.get(synergy.heroId);
						existing.synergizesWith.push(analysis.ourHeroId);
						existing.avgWinRate = (existing.avgWinRate + parseFloat(synergy.winRateWith)) / 2;
					}
				});
			});

			// Find heroes that are both good counters AND good synergy
			const hybridRecommendations = [];
			allCounterSuggestions.forEach((counter, heroId) => {
				if (allSynergySuggestions.has(heroId)) {
					const synergy = allSynergySuggestions.get(heroId);
					hybridRecommendations.push({
						heroId,
						heroName: counter.heroName,
						role: "Hybrid Pick",
						counterValue: counter.totalAdvantage,
						synergyValue: synergy.avgWinRate,
						reason: `Counters ${counter.countersHeroes.length} enemy heroes, synergizes with ${synergy.synergizesWith.length} ally heroes`
					});
				}
			});

			// Create final recommendations
			const recommendations = {
				phase,
				bracket: bracket || "ALL",
				ourTeam: ourPicks,
				enemyTeam: enemyPicks,
				
				topCounterPicks: Array.from(allCounterSuggestions.values())
					.sort((a, b) => b.totalAdvantage - a.totalAdvantage)
					.slice(0, 5),
					
				topSynergyPicks: Array.from(allSynergySuggestions.values())
					.sort((a, b) => b.avgWinRate - a.avgWinRate)
					.slice(0, 5),
					
				hybridRecommendations: hybridRecommendations
					.sort((a, b) => (b.counterValue + b.synergyValue) - (a.counterValue + a.synergyValue))
					.slice(0, 3),

				strategicAdvice: {
					enemyTeamStrategy: enemyPicks.length > 2 ? "Analyze enemy team composition for their win condition" : "Wait for more enemy picks",
					ourGamePlan: ourPicks.length > 2 ? "Focus on your team's power spikes and objective control" : "Build around synergies",
					keyTimings: "Identify when your team is strongest vs enemy team",
					itemizationPriority: "Consider counter-items based on enemy heroes"
				},

				banSuggestions: phase === "BAN" ? 
					Array.from(allCounterSuggestions.values())
						.filter(counter => counter.countersHeroes.length >= 2)
						.slice(0, 3)
						.map(counter => ({
							heroName: counter.heroName,
							reason: `Strong counter to multiple heroes: ${counter.countersHeroes.join(', ')}`
						})) : []
			};

			return {
				content: [{
					type: "text",
					text: JSON.stringify(recommendations, null, 2)
				}]
			};
		} catch (error) {
			return {
				isError: true,
				content: [{
					type: "text",
					text: `Draft assistance error: ${error}`
				}]
			};
		}
	}
);

// Expert-level raw GraphQL tool (hidden by default)
server.tool(
	"dota.expert.graphql",
	"[EXPERT] Execute raw GraphQL queries against STRATZ API",
	{
		query: z.string().describe("Raw GraphQL query"),
		variables: z.union([
			z.string().transform((str) => JSON.parse(str)),
			z.record(z.any())
		]).optional().describe("Query variables as object or JSON string")
	},
	async ({ query, variables }) => {
		try {
			const data = await executeGraphQL(query, variables);
			return {
				content: [{
					type: "text",
					text: JSON.stringify(data, null, 2)
				}]
			};
		} catch (error) {
			return {
				isError: true,
				content: [{
					type: "text",
					text: `GraphQL execution error: ${error}`
				}]
			};
		}
	}
);

// Health check
app.get('/health', (req, res) => {
	res.json({ 
		status: 'ok', 
		name: env.NAME,
		endpoint: env.ENDPOINT,
		hasAuth: !!env.STRATZ_API_TOKEN,
		timestamp: new Date().toISOString()
	});
});

const transport = new StreamableHTTPServerTransport({
	sessionIdGenerator: undefined,
});

server.connect(transport);

app.get('/mcp', (req, res) => {
	transport.handleRequest(req, res);
});

app.post('/mcp', (req, res) => {
	transport.handleRequest(req, res, req.body);
});

async function main() {
	const httpServer = createServer(app);
	
	httpServer.listen(env.PORT, env.HOST, () => {
		console.log(`🚀 Dota 2 MCP Server started on ${env.HOST}:${env.PORT}`);
		console.log(`🔗 STRATZ API: ${env.ENDPOINT}`);
		console.log(`🔑 Auth: ${env.STRATZ_API_TOKEN ? 'Configured' : 'MISSING'}`);
		console.log(`📊 Health: http://${env.HOST}:${env.PORT}/health`);
		console.log(`🔌 MCP: http://${env.HOST}:${env.PORT}/mcp`);
	});
}

main().catch((error) => {
	console.error(`❌ Error: ${error}`);
	process.exit(1);
});
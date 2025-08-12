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
	PORT: z.string().default("3001").transform((val) => parseInt(val, 10)),
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

// Common GraphQL request function
async function executeGraphQL(query: string, variables?: Record<string, any>) {
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

		return data.data;
	} catch (error) {
		throw new Error(`GraphQL request failed: ${error}`);
	}
}

// Resources for documentation
server.resource("doc://dota/quickstart", "doc://dota/quickstart", async () => ({
	contents: [{
		uri: "doc://dota/quickstart",
		text: `# Dota 2 MCP Server Quick Start

## Authentication
Set STRATZ_API_TOKEN environment variable with your STRATZ API token.

## Common Workflows
1. **Player Analysis**: dota.player.profile → dota.player.matches → dota.player.heroes
2. **Match Analysis**: dota.match.summary → dota.match.players → dota.match.breakdown
3. **Meta Research**: dota.meta.heroStats → dota.meta.counters → dota.meta.items

## Steam ID Format
Use 32-bit Steam Account IDs (not 64-bit). Example: 86745912 (not 76561198046011640)

## Common Errors
- 403: Missing or invalid STRATZ_API_TOKEN
- Player not found: Check Steam ID format (use 32-bit)
- Match not found: Ensure match ID exists and is public`
	}]
}));

server.resource("doc://dota/ids", "doc://dota/ids", async () => ({
	contents: [{
		uri: "doc://dota/ids",
		text: `# Dota 2 ID Reference

## Steam Account ID
- Use 32-bit Steam Account ID: 86745912
- NOT 64-bit Steam ID: 76561198046011640
- Convert: steamID64 - 76561197960265728 = steamAccountID

## Hero IDs
Common heroes:
- Pudge: 14, Invoker: 74, Anti-Mage: 1
- Sniper: 35, Crystal Maiden: 5, Drow Ranger: 6

## Item IDs
Common items:
- Black King Bar: 116, Aegis: 277, Divine Rapier: 133
- Boots of Speed: 29, Magic Wand: 34

## League IDs
Major tournaments:
- The International: varies yearly
- DPC Leagues: check current season`
	}]
}));

// Prompts for common workflows
server.prompt("analyze-player", "Analyze a Dota 2 player's performance", {
	steamAccountId: z.number().describe("32-bit Steam Account ID")
}, async ({ steamAccountId }) => ({
	messages: [{
		role: "user",
		content: {
			type: "text",
			text: `Analyze player ${steamAccountId}:
1. Use dota.player.profile to get basic info
2. Use dota.player.matches for recent performance
3. Use dota.player.heroes for hero specialization
4. Summarize strengths, weaknesses, and recommendations`
		}
	}]
}));

server.prompt("analyze-match", "Analyze a specific Dota 2 match", {
	matchId: z.number().describe("Match ID")
}, async ({ matchId }) => ({
	messages: [{
		role: "user",
		content: {
			type: "text",
			text: `Analyze match ${matchId}:
1. Use dota.match.summary for basic info
2. Use dota.match.players for detailed player stats
3. Identify key moments and turning points
4. Provide strategic insights`
		}
	}]
}));

// Domain-specific tools
server.tool(
	"dota.player.profile",
	"Get Dota 2 player profile with rank, recent activity, and basic stats",
	{
		steamAccountId: z.number().describe("32-bit Steam Account ID (not 64-bit Steam ID)")
	},
	async ({ steamAccountId }) => {
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
					activity {
						month
						matchCount
						winCount
					}
				}
			}
		`;

		try {
			const data = await executeGraphQL(query, { steamAccountId });
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
					text: `Player profile error: ${error}`
				}]
			};
		}
	}
);

server.tool(
	"dota.player.matches",
	"Get recent matches for a player with performance metrics",
	{
		steamAccountId: z.number().describe("32-bit Steam Account ID"),
		take: z.number().default(10).describe("Number of matches to fetch (max 20)")
	},
	async ({ steamAccountId, take }) => {
		const query = `
			query PlayerMatches($steamAccountId: Long!, $take: Int!) {
				player(steamAccountId: $steamAccountId) {
					matches(take: $take) {
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
							items {
								itemId
							}
						}
					}
				}
			}
		`;

		try {
			const data = await executeGraphQL(query, { steamAccountId, take: Math.min(take, 20) });
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
					text: `Player matches error: ${error}`
				}]
			};
		}
	}
);

server.tool(
	"dota.player.heroes",
	"Get player's hero performance statistics",
	{
		steamAccountId: z.number().describe("32-bit Steam Account ID"),
		take: z.number().default(10).describe("Number of heroes to show")
	},
	async ({ steamAccountId, take }) => {
		const query = `
			query PlayerHeroes($steamAccountId: Long!, $take: Int!) {
				player(steamAccountId: $steamAccountId) {
					heroesPerformance(take: $take) {
						heroId
						matchCount
						winCount
						avgKills
						avgDeaths
						avgAssists
						avgGoldPerMinute
						avgExperiencePerMinute
						lastPlayedDateTime
					}
				}
			}
		`;

		try {
			const data = await executeGraphQL(query, { steamAccountId, take });
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
					text: `Player heroes error: ${error}`
				}]
			};
		}
	}
);

server.tool(
	"dota.match.summary",
	"Get Dota 2 match summary with basic info and outcome",
	{
		matchId: z.number().describe("Match ID")
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
					text: `Match summary error: ${error}`
				}]
			};
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

server.tool(
	"dota.meta.counters",
	"Get hero counters and matchup data",
	{
		heroId: z.number().describe("Hero ID to get counters for"),
		patch: z.string().optional().describe("Game patch (e.g., '7.35')")
	},
	async ({ heroId, patch }) => {
		const query = `
			query HeroCounters($heroId: Short!, $patch: String) {
				heroStats {
					heroVsHeroMatchup(heroId: $heroId) {
						vs {
							heroId2
							matchCount
							winCount
							winRate
							synergy
						}
						with {
							heroId2
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
			const data = await executeGraphQL(query, { heroId, patch });
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
					text: `Hero counters error: ${error}`
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
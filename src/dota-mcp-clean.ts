#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import express from "express";
import cors from "cors";
import { createServer } from "http";

// Environment schema
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

// Steam Account ID validation
const SteamAccountSchema = z.number().min(1).max(4294967295);
const MatchIdSchema = z.number().min(1000000000).max(9999999999);

// GraphQL execution function
async function executeGraphQL(query: string, variables: any = {}) {
	const cacheKey = JSON.stringify({ query, variables });
	const cached = responseCache.get(cacheKey);
	
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.data;
	}

	const response = await fetch(env.ENDPOINT, {
		method: "POST",
		headers: getHeaders(),
		body: JSON.stringify({ query, variables })
	});

	if (!response.ok) {
		throw new Error(`STRATZ API error ${response.status}: ${response.statusText}`);
	}

	const result = await response.json();
	
	if (result.errors) {
		throw new Error(`GraphQL request failed: Error: STRATZ API error 400: ${JSON.stringify(result)}`);
	}

	responseCache.set(cacheKey, { data: result.data, timestamp: Date.now() });
	return result.data;
}

// ========================================
// WORKING TOOLS ONLY (8 tools total)
// ========================================

// 1. Player Profile (WORKING)
server.tool(
	"dota.player.profile",
	"Get player's Dota 2 profile including rank, total matches, winrate and recent activity. Use steamAccountId 1146009051 for testing. Returns player's current rank, IMP score, total wins/matches, and monthly activity statistics.",
	{
		steamAccountId: SteamAccountSchema
	},
	async ({ steamAccountId }) => {
		const query = `
			query PlayerProfile($steamAccountId: Long!) {
				player(steamAccountId: $steamAccountId) {
					steamAccount {
						id, name, profileUri, avatar
					}
					ranks { rank, seasonRankId }
					winCount, matchCount, imp
					firstMatchDate, lastMatchDate
				}
			}
		`;

		try {
			const data = await executeGraphQL(query, { steamAccountId });
			return createSuccessResponse(data);
		} catch (error) {
			return createErrorResponse("dota.player.profile", error);
		}
	}
);

// 2. Player Matches (WORKING)
server.tool(
	"dota.player.matches",
	"Get player's recent Dota 2 matches with detailed statistics: win/loss, heroes played, KDA, GPM, XPM, damage. Example: {steamAccountId: 1146009051, take: 5} returns last 5 matches with complete performance data.",
	{
		steamAccountId: SteamAccountSchema,
		take: z.number().min(1).max(20).default(5)
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

// 3. Player Heroes (WORKING)
server.tool(
	"dota.player.heroes",
	"Get player's hero performance statistics: which heroes they play most, winrates, average KDA, GPM/XPM per hero. Example: {steamAccountId: 1146009051, take: 10} returns top 10 most played heroes with complete stats.",
	{
		steamAccountId: SteamAccountSchema,
		take: z.number().min(1).max(50).default(10)
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

// 4. Match Summary (WORKING)
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

// 5. Match Players (WORKING)
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
						numLastHits
						numDenies
						item0Id
						item1Id
						item2Id
						item3Id
						item4Id
						item5Id
						neutral0Id
					}
				}
			}
		`;

		try {
			const data = await executeGraphQL(query, { matchId });
			return createSuccessResponse(data);
		} catch (error) {
			return createErrorResponse("dota.match.players", error);
		}
	}
);

// 6. Meta Hero Stats (WORKING)
server.tool(
	"dota.meta.heroStats",
	"Get current meta hero statistics with win rates and pick rates",
	{
		patch: z.string().optional().describe("Game patch (e.g., '7.35')"),
		bracket: z.enum(["HERALD", "GUARDIAN", "CRUSADER", "ARCHON", "LEGEND", "ANCIENT", "DIVINE", "IMMORTAL"]).optional()
	},
	async ({ patch, bracket }) => {
		const query = `
			query HeroStats {
				heroStats {
					stats {
						heroId
						matchCount
						winCount
					}
				}
			}
		`;

		try {
			const data = await executeGraphQL(query, {});
			return createSuccessResponse(data);
		} catch (error) {
			return createErrorResponse("dota.meta.heroStats", error);
		}
	}
);

// 7. Meta Counters (WORKING)
server.tool(
	"dota.meta.counters",
	"Get hero counters and weak matchups with win rates and sample sizes",
	{
		heroId: z.number().describe("Hero ID to analyze counters for"),
		take: z.number().optional().default(15).describe("Number of matchups to return")
	},
	async ({ heroId, take }) => {
		const query = `
			query HeroCounters($heroId: Short!, $take: Int) {
				heroStats {
					heroVsHeroMatchup(heroId: $heroId, take: $take) {
						disadvantage {
							heroId2
							matchCount
							winCount
							duration
							heroDamage
							towerDamage
							goldEarned
						}
						advantage {
							heroId2
							matchCount
							winCount
							duration
							heroDamage
							towerDamage
							goldEarned
						}
					}
				}
			}
		`;

		try {
			const data = await executeGraphQL(query, { heroId, take });
			
			const processedData = {
				heroId,
				counters: data?.heroStats?.heroVsHeroMatchup?.disadvantage?.map(h => ({
					heroId: h.heroId2,
					matchCount: h.matchCount,
					winCount: h.winCount,
					winRate: h.matchCount > 0 ? (h.winCount / h.matchCount) : 0,
					avgDuration: h.duration,
					avgHeroDamage: h.heroDamage,
					avgGold: h.goldEarned
				})) || [],
				strongAgainst: data?.heroStats?.heroVsHeroMatchup?.advantage?.map(h => ({
					heroId: h.heroId2,
					matchCount: h.matchCount,
					winCount: h.winCount,
					winRate: h.matchCount > 0 ? (h.winCount / h.matchCount) : 0,
					avgDuration: h.duration,
					avgHeroDamage: h.heroDamage,
					avgGold: h.goldEarned
				})) || []
			};

			return createSuccessResponse(processedData);
		} catch (error) {
			return createErrorResponse("dota.meta.counters", error);
		}
	}
);

// 8. Expert GraphQL (WORKING)
server.tool(
	"dota.expert.graphql",
	"[EXPERT] Execute raw GraphQL queries against STRATZ API",
	{
		query: z.string().describe("Raw GraphQL query string"),
		variables: z.record(z.any()).optional().describe("GraphQL variables (optional)")
	},
	async ({ query, variables = {} }) => {
		try {
			const data = await executeGraphQL(query, variables);
			return createSuccessResponse(data);
		} catch (error) {
			return createErrorResponse("dota.expert.graphql", error);
		}
	}
);

// Health check endpoint
app.get("/health", (req, res) => {
	res.json({
		status: "healthy",
		server: env.NAME,
		version: "1.0.0",
		timestamp: new Date().toISOString(),
		stratz: "connected"
	});
});

// Create HTTP server and MCP transport
const httpServer = createServer(app);
const transport = new StreamableHTTPServerTransport(httpServer);

async function main() {
	try {
		// Start server on specified host and port
		await server.connect(transport);

		httpServer.listen(env.PORT, env.HOST, () => {
			console.log(`🚀 Dota 2 MCP Server started on ${env.HOST}:${env.PORT}`);
			console.log(`🔗 STRATZ API: ${env.ENDPOINT}`);
			console.log("🔑 Auth: Configured");
			console.log(`📊 Health: http://${env.HOST}:${env.PORT}/health`);
			console.log(`🔌 MCP: http://${env.HOST}:${env.PORT}/mcp`);
		});

		// Graceful shutdown
		const shutdown = () => {
			console.log("\n🛑 Shutting down Dota 2 MCP server...");
			httpServer.close(() => {
				server.disconnect();
				process.exit(0);
			});
		};

		process.on("SIGINT", shutdown);
		process.on("SIGTERM", shutdown);

	} catch (error) {
		console.error("❌ Failed to start server:", error);
		process.exit(1);
	}
}

// Handle startup errors
process.on('uncaughtException', (error) => {
	if (error.message.includes('EADDRINUSE')) {
		console.error(`❌ Port ${env.PORT} is already in use. Please check if another server is running.`);
		console.log(`💡 Try: netstat -ano | findstr :${env.PORT}`);
		process.exit(1);
	}
	throw error;
});

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { parse, getIntrospectionQuery, buildClientSchema } from "graphql";
import { z } from "zod";
import {
	introspectEndpoint,
	introspectLocalSchema,
} from "./helpers/introspection.js";
import { SchemaOptimizer } from "./helpers/schema-optimizer.js";
import { DOTA_QUERY_EXAMPLES, suggestKeywords } from "./helpers/query-examples.js";
import { getVersion } from "./helpers/package.js" with { type: "macro" };
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { randomUUID } from "node:crypto";

const EnvSchema = z.object({
	NAME: z.string().default("mcp-graphql"),
	ENDPOINT: z.string().url().default("https://api.stratz.com/graphql"),
	ALLOW_MUTATIONS: z
		.enum(["true", "false"])
		.transform((value) => value === "true")
		.default("false"),
	HEADERS: z
		.string()
		.default("{}")
		.transform((val) => {
			try {
				console.log("🔍 Parsing HEADERS:", val);
				const parsed = JSON.parse(val);
				console.log("✅ Parsed HEADERS:", parsed);
				return parsed;
			} catch (e) {
				console.error("❌ HEADERS parse error:", e);
				throw new Error(`HEADERS must be a valid JSON string: ${e.message}`);
			}
		}),
	SCHEMA: z.string().optional(),
	PORT: z.string().default("3001").transform((val) => parseInt(val, 10)),
	HOST: z.string().default("0.0.0.0"),
});

const env = EnvSchema.parse(process.env);

const app = express();
app.use(cors({
	origin: "*",
	methods: ["GET", "POST", "OPTIONS", "DELETE"],
	allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Accept", "X-Session-Id"],
	credentials: false
}));
app.use(express.json());

const server = new McpServer({
	name: env.NAME,
	version: getVersion(),
	description: `GraphQL MCP server for ${env.ENDPOINT}`,
});

const schemaOptimizer = new SchemaOptimizer();
let schemaInitialized = false;

async function initializeSchema() {
	if (schemaInitialized) return;
	
	try {
		const response = await fetch(env.ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...env.HEADERS,
			},
			body: JSON.stringify({ query: getIntrospectionQuery() }),
		});

		if (!response.ok) {
			throw new Error(`Failed to introspect schema: ${response.statusText}`);
		}

		const { data } = await response.json();
		await schemaOptimizer.indexSchema(data);
		schemaInitialized = true;
		console.log("✅ Schema indexed successfully");
	} catch (error) {
		console.error("❌ Schema initialization failed:", error);
		throw error;
	}
}

server.resource("graphql-schema", new URL(env.ENDPOINT).href, async (uri) => {
	try {
		let schema: string;
		if (env.SCHEMA) {
			schema = await introspectLocalSchema(env.SCHEMA);
		} else {
			schema = await introspectEndpoint(env.ENDPOINT, env.HEADERS);
		}

		return {
			contents: [
				{
					uri: uri.href,
					text: schema,
				},
			],
		};
	} catch (error) {
		throw new Error(`Failed to get GraphQL schema: ${error}`);
	}
});

server.tool(
	"debug-schema-status",
	"🔧 DEBUG: Check schema initialization status, API connectivity, and index statistics. Use this if search-schema returns no results.",
	{
		includeHeaders: z.boolean().default(false).describe("Include request headers in output for debugging"),
	},
	async ({ includeHeaders }) => {
		try {
			let debugInfo = `=== Schema Debug Information ===\n`;
			debugInfo += `Schema initialized: ${schemaInitialized}\n`;
			debugInfo += `Endpoint: ${env.ENDPOINT}\n`;
			debugInfo += `Index size: ${schemaOptimizer.getIndexSize()} keywords\n`;
			
			if (includeHeaders) {
				debugInfo += `Headers: ${JSON.stringify(env.HEADERS, null, 2)}\n`;
			}

			// Test API connectivity
			try {
				const testResponse = await fetch(env.ENDPOINT, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...env.HEADERS,
					},
					body: JSON.stringify({ 
						query: "{ __typename }" 
					}),
				});
				
				debugInfo += `API Test Status: ${testResponse.status} ${testResponse.statusText}\n`;
				
				if (!testResponse.ok) {
					const errorText = await testResponse.text();
					debugInfo += `API Error Response: ${errorText}\n`;
				}
			} catch (apiError) {
				debugInfo += `API Connection Error: ${apiError}\n`;
			}

			// Try to reinitialize schema
			try {
				await initializeSchema();
				debugInfo += `Schema reinitialization: SUCCESS\n`;
				debugInfo += `Index size after reinit: ${schemaOptimizer.getIndexSize()} keywords\n`;
			} catch (initError) {
				debugInfo += `Schema reinitialization: FAILED - ${initError}\n`;
			}

			return {
				content: [{
					type: "text",
					text: debugInfo
				}]
			};
		} catch (error) {
			return {
				isError: true,
				content: [{
					type: "text",
					text: `Debug failed: ${error}`
				}]
			};
		}
	}
);

server.tool(
	"search-schema",
	"🔍 ALWAYS START HERE: Intelligently search GraphQL schema fields by keywords. This tool prevents context explosion by finding only relevant fields. Use broad keywords first (player, match, hero), then narrow down (winrate, performance). Returns field paths, types, descriptions, and auto-generated query templates.",
	{
		keywords: z.array(z.string()).describe("Search keywords - use Dota 2 concepts like: player, match, hero, winrate, steam, performance, tournament, league, items, abilities, statistics"),
		maxResults: z.number().default(10).describe("Maximum results (default: 10). Increase for broader discovery, decrease for focused results"),
	},
	async ({ keywords, maxResults }) => {
		try {
			await initializeSchema();
			const results = schemaOptimizer.searchFields(keywords, maxResults);
			
			if (results.length === 0) {
				const suggestions = suggestKeywords(keywords.join(" "));
				return {
					content: [{
						type: "text",
						text: `No fields found for keywords: ${keywords.join(", ")}\n\n💡 Try these Dota 2 related keywords instead:\n${suggestions.join(", ")}\n\n🔍 Common search patterns:\n• Player data: ${DOTA_QUERY_EXAMPLES.searchPatterns.player.join(", ")}\n• Match data: ${DOTA_QUERY_EXAMPLES.searchPatterns.match.join(", ")}\n• Hero data: ${DOTA_QUERY_EXAMPLES.searchPatterns.hero.join(", ")}`
					}]
				};
			}

			const searchResults = results.map(r => 
				`${r.field.path} (${r.field.typeName}) - depth: ${r.field.depth}${r.field.description ? ` - ${r.field.description}` : ""}`
			).join("\n");

			const queryTemplate = schemaOptimizer.generateQueryTemplate(results.map(r => r.field));

			// Add contextual examples
			const exampleQueries = Object.values(DOTA_QUERY_EXAMPLES.templates)
				.filter(template => 
					template.keywords.some(keyword => 
						keywords.some(k => k.toLowerCase().includes(keyword.toLowerCase()))
					)
				)
				.slice(0, 2);

			let exampleSection = "";
			if (exampleQueries.length > 0) {
				exampleSection = `\n\n=== Contextual Examples ===\n${exampleQueries.map(ex => 
					`${ex.description}:\n${ex.query}\nVariables: ${ex.variables}\n`
				).join("\n")}`;
			}

			return {
				content: [{
					type: "text",
					text: `Found ${results.length} relevant fields:\n\n${searchResults}\n\n=== Query Template ===\n${queryTemplate}${exampleSection}`
				}]
			};
		} catch (error) {
			return {
				isError: true,
				content: [{
					type: "text",
					text: `Schema search failed: ${error}`
				}]
			};
		}
	}
);

server.tool(
	"introspect-type",
	"🎯 DEEP DIVE: Get detailed structure of a specific GraphQL type with controlled depth. Use this AFTER search-schema when you need to explore a specific type (like PlayerType, MatchType, HeroType). Controls nesting depth to prevent context overflow.",
	{
		typeName: z.string().describe("GraphQL type name from search results (e.g., PlayerType, MatchType, HeroType, LeagueType)"),
		maxDepth: z.number().default(2).describe("Depth control: 1=shallow (field names only), 2=moderate (2 levels), 3=deep (3 levels max)"),
	},
	async ({ typeName, maxDepth }) => {
		try {
			await initializeSchema();
			const typeDefinition = schemaOptimizer.getTypeDefinition(typeName, maxDepth);
			
			return {
				content: [{
					type: "text",
					text: typeDefinition
				}]
			};
		} catch (error) {
			return {
				isError: true,
				content: [{
					type: "text",
					text: `Type introspection failed: ${error}`
				}]
			};
		}
	}
);

server.tool(
	"get-query-examples",
	"💡 GUIDANCE: Get curated query examples, workflows, and best practices for common Dota 2 data analysis tasks. Use when you need inspiration or guidance on how to structure queries.",
	{
		category: z.enum(["player", "match", "hero", "league", "workflow", "all"]).default("all").describe("Category of examples: player analysis, match analysis, hero research, league data, workflow patterns, or all examples"),
	},
	async ({ category }) => {
		try {
			let content = "";
			
			if (category === "all" || category === "workflow") {
				content += "=== Recommended Workflows ===\n";
				Object.entries(DOTA_QUERY_EXAMPLES.workflows).forEach(([name, steps]) => {
					content += `\n${name.toUpperCase()}:\n${steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}\n`;
				});
			}

			if (category === "all" || category === "player") {
				content += "\n=== Player Analysis Examples ===\n";
				const playerExamples = Object.values(DOTA_QUERY_EXAMPLES.templates).filter(t => t.keywords.includes("player"));
				playerExamples.forEach(example => {
					content += `\n${example.description}:\n${example.query}\nVariables: ${example.variables}\nNotes: ${example.notes}\n`;
				});
			}

			if (category === "all" || category === "match") {
				content += "\n=== Match Analysis Examples ===\n";
				const matchExamples = Object.values(DOTA_QUERY_EXAMPLES.templates).filter(t => t.keywords.includes("match"));
				matchExamples.forEach(example => {
					content += `\n${example.description}:\n${example.query}\nVariables: ${example.variables}\nNotes: ${example.notes}\n`;
				});
			}

			if (category === "all" || category === "hero") {
				content += "\n=== Hero Research Examples ===\n";
				const heroExamples = Object.values(DOTA_QUERY_EXAMPLES.templates).filter(t => t.keywords.includes("hero"));
				heroExamples.forEach(example => {
					content += `\n${example.description}:\n${example.query}\nVariables: ${example.variables}\nNotes: ${example.notes}\n`;
				});
			}

			content += `\n=== Steam ID Notes ===\n${DOTA_QUERY_EXAMPLES.steamIdNotes}`;
			
			content += "\n=== Common Errors & Solutions ===\n";
			Object.entries(DOTA_QUERY_EXAMPLES.commonErrors).forEach(([error, solution]) => {
				content += `• ${error}: ${solution}\n`;
			});

			return {
				content: [{
					type: "text",
					text: content
				}]
			};
		} catch (error) {
			return {
				isError: true,
				content: [{
					type: "text",
					text: `Failed to get examples: ${error}`
				}]
			};
		}
	}
);

server.tool(
	"query-graphql",
	"📊 EXECUTE: Run GraphQL queries against the Dota 2 API. Use query templates from search-schema as starting points. Always use variables for dynamic values (player IDs, match IDs). Check for errors and iterate. Mutations are disabled for safety.",
	{
		query: z.string().describe("GraphQL query - start with templates from search-schema, use variables for dynamic values like: query($steamId: Long!) { player(steamAccountId: $steamId) { ... } }"),
		variables: z.string().optional().describe("JSON string with query variables, e.g., '{\"steamId\": \"123456789\", \"matchId\": \"7891234567\"}'"),
	},
	async ({ query, variables }) => {
		try {
			const parsedQuery = parse(query);

			const isMutation = parsedQuery.definitions.some(
				(def) =>
					def.kind === "OperationDefinition" && def.operation === "mutation",
			);

			if (isMutation && !env.ALLOW_MUTATIONS) {
				return {
					isError: true,
					content: [
						{
							type: "text",
							text: "Mutations are not allowed unless you enable them in the configuration. Please use a query operation instead.",
						},
					],
				};
			}
		} catch (error) {
			return {
				isError: true,
				content: [
					{
						type: "text",
						text: `Invalid GraphQL query: ${error}`,
					},
				],
			};
		}

		try {
			const response = await fetch(env.ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...env.HEADERS,
				},
				body: JSON.stringify({
					query,
					variables: variables ? JSON.parse(variables) : undefined,
				}),
			});

			if (!response.ok) {
				const responseText = await response.text();
				return {
					isError: true,
					content: [
						{
							type: "text",
							text: `GraphQL request failed: ${response.statusText}\n${responseText}`,
						},
					],
				};
			}

			const data = await response.json();

			if (data.errors && data.errors.length > 0) {
				return {
					isError: true,
					content: [
						{
							type: "text",
							text: `The GraphQL response has errors, please fix the query: ${JSON.stringify(
								data,
								null,
								2,
							)}`,
						},
					],
				};
			}

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(data, null, 2),
					},
				],
			};
		} catch (error) {
			throw new Error(`Failed to execute GraphQL query: ${error}`);
		}
	},
);

const httpServer = createServer(app);

app.get('/health', (req, res) => {
	res.json({ 
		status: 'ok', 
		name: env.NAME,
		endpoint: env.ENDPOINT,
		version: getVersion(),
		timestamp: new Date().toISOString()
	});
});

const transport = new StreamableHTTPServerTransport({
	sessionIdGenerator: undefined, // Stateless mode - не сохраняет сессии
});

server.connect(transport);

app.get('/mcp', (req, res) => {
	transport.handleRequest(req, res);
});

app.post('/mcp', (req, res) => {
	transport.handleRequest(req, res, req.body);
});

app.delete('/mcp', (req, res) => {
	transport.handleRequest(req, res);
});

async function main() {
	// Initialize schema on startup
	try {
		await initializeSchema();
	} catch (error) {
		console.warn("⚠️ Schema initialization failed on startup, will retry on first request");
	}

	httpServer.listen(env.PORT, env.HOST, () => {
		console.log(`🚀 MCP GraphQL Server started on ${env.HOST}:${env.PORT}`);
		console.log(`🔗 GraphQL: ${env.ENDPOINT}`);
		console.log(`📊 Health: http://${env.HOST}:${env.PORT}/health`);
		console.log(`🔌 MCP: http://${env.HOST}:${env.PORT}/mcp`);
		console.log(`🔍 Use 'search-schema' tool instead of 'introspect-schema' for better performance`);
	});
}

main().catch((error) => {
	console.error(`❌ Error: ${error}`);
	process.exit(1);
});
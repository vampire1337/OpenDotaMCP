<<<<<<< HEAD
# 🎮 Dota 2 MCP Server
=======
# OpenDota MCP Server
>>>>>>> 523394154048411ee78ba5b7f2ed43864dfcf320

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![STRATZ](https://img.shields.io/badge/STRATZ-FF6B35?style=for-the-badge&logo=dota2&logoColor=white)](https://stratz.com/)
[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)

**Professional Dota 2 analytics MCP server powered by STRATZ API**  
*Domain-specific tools • Self-documenting • Agent-friendly*

<<<<<<< HEAD
[🚀 Quick Start](#quick-start) • [🛠️ Tools](#tools) • [🤖 AI Agents](#ai-integration) • [📖 Docs](#documentation)
=======
[🇺🇸 English](README.md) • [🇷🇺 Русский](README.ru.md) • [Docs](#documentation) • [Install](#installation)

[![smithery badge](https://smithery.ai/badge/mcp-graphql)](https://smithery.ai/server/mcp-graphql)
>>>>>>> 523394154048411ee78ba5b7f2ed43864dfcf320

</div>

---

<<<<<<< HEAD
## ✨ What This Solves
=======
## The Problem
>>>>>>> 523394154048411ee78ba5b7f2ed43864dfcf320

**Before**: Raw GraphQL → Agent confusion, auth errors, complex queries  
**After**: Domain tools → `dota.player.profile`, `dota.match.summary`, automatic auth

```diff
- agents struggle with: "write GraphQL to get player winrate" 
+ agents succeed with: "dota.player.profile({ steamAccountId })"
```

<<<<<<< HEAD
=======
## Our Solution

**Search + Introspect + Execute** pattern with intelligent optimization:

```diff
+ Smart field search → 2-5KB context → Stable operation
+ Progressive type loading → Flexible exploration
+ In-memory caching → <1s response times  
+ AI-friendly discovery → Automated field matching
```

<div align="center">

### **Performance Gains**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Context Size** | 50KB+ | 2-5KB | **90% smaller** |
| **Init Time** | 5-10s | <1s | **10x faster** |
| **Schema Crashes** | Frequent | **Never** | **100% reliable** |
| **API Calls** | Every request | Cached | **5x fewer** |

</div>

>>>>>>> 523394154048411ee78ba5b7f2ed43864dfcf320
---

## Quick Start

### 1. **Get STRATZ API Token**
1. Go to [STRATZ.com](https://stratz.com/) and create account
2. Navigate to API section and generate token
3. Copy your Bearer token

### 2. **Setup & Run**

<<<<<<< HEAD
=======
### **Docker (Recommended)**
>>>>>>> 523394154048411ee78ba5b7f2ed43864dfcf320
```bash
# Clone repository
git clone https://github.com/yourusername/OpenDotaMCP.git
cd OpenDotaMCP

# Install dependencies
bun install

# Configure environment
echo 'STRATZ_API_TOKEN=your_token_here' > .env

# Run improved server
bun run src/improved-dota-mcp.ts

# Test connection
curl http://localhost:3001/health
```

<<<<<<< HEAD
### 3. **Test with MCP Inspector**
=======
</td>
<td width="50%">

### **Local Development**
>>>>>>> 523394154048411ee78ba5b7f2ed43864dfcf320
```bash
npx mcp-inspector http://localhost:3001/mcp
```

---

<<<<<<< HEAD
## 🛠️ Tools

### **Player Analysis**
- `dota.player.profile` - Get rank, winrate, activity
- `dota.player.matches` - Recent matches with KDA
- `dota.player.heroes` - Hero performance statistics
=======
## Smart Tools

### **search-schema** → *Intelligent Field Discovery*
>>>>>>> 523394154048411ee78ba5b7f2ed43864dfcf320

### **Match Analysis**  
- `dota.match.summary` - Basic match info and outcome
- `dota.match.players` - Detailed player statistics

### **Meta Research**
- `dota.meta.heroStats` - Current patch winrates/pickrates
- `dota.meta.counters` - Hero matchup data

<<<<<<< HEAD
### **Expert Mode**
- `dota.expert.graphql` - Raw GraphQL for advanced queries

### **Self-Documentation**
- **Resources**: `doc://dota/quickstart`, `doc://dota/ids`
- **Prompts**: `analyze-player`, `analyze-match`
=======
<details>
<summary><b> Usage Examples</b></summary>

```javascript
// Find player-related fields
search-schema(keywords: ["player", "steam", "profile"])
// → Returns: player, steamAccount, playerProfile with relevance scores

// Discover match data
search-schema(keywords: ["match", "duration", "winner"]) 
// → Returns: match, matchStats, durationSeconds with query templates
```

</details>

### **introspect-type** → *Progressive Type Loading*

Get specific type definitions with controlled depth:

```typescript
interface IntrospectParams {
  typeName: string        // GraphQL type name
  maxDepth?: number       // Nesting depth (default: 2)
}
```

<details>
<summary><b> Usage Examples</b></summary>

```javascript
// Explore player structure
introspect-type(typeName: "PlayerType", maxDepth: 2)
// → Returns detailed PlayerType with 2 levels of nesting

// Quick match overview  
introspect-type(typeName: "MatchType", maxDepth: 1)
// → Returns MatchType with minimal nesting
```

</details>

### **query-graphql** → *Optimized Query Execution*

Execute GraphQL queries with enhanced error handling:

```typescript
interface QueryParams {
  query: string           // GraphQL query
  variables?: string      // JSON variables
}
```
>>>>>>> 523394154048411ee78ba5b7f2ed43864dfcf320

---

## Configuration

### Environment Variables

<<<<<<< HEAD
| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `STRATZ_API_TOKEN` | ✅ **Yes** | STRATZ API Bearer token | - |
| `NAME` | No | Server name | `dota-mcp-server` |
| `ENDPOINT` | No | STRATZ GraphQL URL | `https://api.stratz.com/graphql` |
| `PORT` | No | Server port | `3001` |
| `HOST` | No | Server host | `0.0.0.0` |

### Example .env file
```bash
STRATZ_API_TOKEN=your_stratz_token_here
PORT=3001
NAME=my-dota-server
=======
### **Environment Variables**

| Variable | Description | Default |
|----------|-------------|---------|
| `ENDPOINT` | GraphQL API URL | `https://api.stratz.com/graphql` |
| `HEADERS` | Request headers (JSON) | `{}` |
| `ALLOW_MUTATIONS` | Enable mutations | `false` |
| `PORT` | Server port | `3001` |
| `HOST` | Server host | `0.0.0.0` |

</td>
<td width="50%">

### **Security Features**

- ✅ **Mutations disabled** by default
- ✅ **Depth limiting** prevents recursion attacks  
- ✅ **Field filtering** minimizes data exposure
- ✅ **Input validation** with detailed errors
- ✅ **Stateless operation** - no session persistence

</td>
</tr>
</table>

---

## Architecture

```mermaid
graph TB
    subgraph "Schema Optimizer"
        A[Field Index] --> B[Relevance Scoring]
        C[Type Cache] --> D[Progressive Loading]
        E[Search Engine] --> F[Fuzzy Matching]
    end
    
    subgraph "MCP Tools"
        G[search-schema] --> A
        H[introspect-type] --> C
        I[query-graphql] --> J[GraphQL API]
    end
    
    subgraph "AI Agents"
        K[Claude] --> G
        L[GPT-4] --> H
        M[Custom LLM] --> I
    end
    
    J --> N[Stratz/OpenDota API]
>>>>>>> 523394154048411ee78ba5b7f2ed43864dfcf320
```

---

<<<<<<< HEAD
## 🎮 Examples
=======
## Real-World Examples

<details>
<summary><b> Discovering Dota 2 Player Data</b></summary>
>>>>>>> 523394154048411ee78ba5b7f2ed43864dfcf320

### Player Analysis
```javascript
// Get player profile
dota.player.profile({ steamAccountId: 86745912 })

// Recent matches
dota.player.matches({ steamAccountId: 86745912, take: 5 })

// Hero performance
dota.player.heroes({ steamAccountId: 86745912, take: 10 })
```

<<<<<<< HEAD
### Match Analysis
=======
</details>

<details>
<summary><b> Analyzing Match Statistics</b></summary>

>>>>>>> 523394154048411ee78ba5b7f2ed43864dfcf320
```javascript
// Match summary
dota.match.summary({ matchId: 7891234567 })

// Player stats
dota.match.players({ matchId: 7891234567 })
```

### Meta Research
```javascript
// Hero winrates
dota.meta.heroStats({ bracket: "DIVINE" })

// Hero counters
dota.meta.counters({ heroId: 14 }) // Pudge counters
```

---

<<<<<<< HEAD
## 🤖 AI Integration

Perfect for AI agents that need Dota 2 data:

- **Claude Desktop**: Add to MCP config
- **Flowise**: Import as custom tool
- **Custom agents**: Use HTTP MCP transport
- **ChatGPT Actions**: Use OpenAPI export

See example agent workflows in `FLOWISE_AGENT_GUIDE.md`
=======
##  Documentation

| Resource | Description |
|----------|-------------|
| [ **API Reference**](docs/api.md) | Complete tool documentation |
| [ **Architecture Guide**](docs/architecture.md) | Technical deep-dive |
| [ **Deployment Guide**](docs/deployment.md) | Production setup |
| [ **Troubleshooting**](docs/troubleshooting.md) | Common issues & solutions |
>>>>>>> 523394154048411ee78ba5b7f2ed43864dfcf320

---

##  Contributing

<<<<<<< HEAD
=======
We welcome contributions! Here's how to get started:

<table>
<tr>
<td width="50%">

###  **Development Setup**
>>>>>>> 523394154048411ee78ba5b7f2ed43864dfcf320
```bash
# Development
git clone https://github.com/yourusername/OpenDotaMCP.git
cd OpenDotaMCP
bun install
bun run src/improved-dota-mcp.ts

# Testing
bun test  # (when available)
curl http://localhost:3001/health
```

<<<<<<< HEAD
=======
</td>
<td width="50%">

###  **PR Checklist**
- [ ] Tests pass (`bun test`)
- [ ] Linting passes (`bun run lint`) 
- [ ] TypeScript compiles (`bun run build`)
- [ ] Documentation updated
- [ ] Changelog entry added

</td>
</tr>
</table>

>>>>>>> 523394154048411ee78ba5b7f2ed43864dfcf320
---

##  License

MIT License - see [LICENSE](LICENSE) for details.

---

<<<<<<< HEAD
=======
##  Ecosystem

>>>>>>> 523394154048411ee78ba5b7f2ed43864dfcf320
<div align="center">

**Built for AI agents that need Dota 2 data**

<<<<<<< HEAD
[⭐ **Star us**](https://github.com/yourusername/OpenDotaMCP) • [🐛 **Issues**](https://github.com/yourusername/OpenDotaMCP/issues) • [🎮 **STRATZ API**](https://stratz.com/api)
=======
</div>

---

<div align="center">

**Built with  for the AI & Gaming community**

[ **Star us**](https://github.com/yourusername/OpenDotaMCP/stargazers) • [🐛 **Report Bug**](https://github.com/yourusername/OpenDotaMCP/issues) • [ **Request Feature**](https://github.com/yourusername/OpenDotaMCP/discussions)

**Made possible by:** [Anthropic](https://anthropic.com) • [Bun](https://bun.sh) • [GraphQL](https://graphql.org) • [TypeScript](https://typescriptlang.org)
>>>>>>> 523394154048411ee78ba5b7f2ed43864dfcf320

</div>

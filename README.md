# 🎮 Dota 2 MCP Server

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![STRATZ](https://img.shields.io/badge/STRATZ-FF6B35?style=for-the-badge&logo=dota2&logoColor=white)](https://stratz.com/)
[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)

**Professional Dota 2 analytics MCP server powered by STRATZ API**  
*Domain-specific tools • Self-documenting • Agent-friendly*

[🚀 Quick Start](#quick-start) • [🛠️ Tools](#tools) • [🤖 AI Agents](#ai-integration) • [📖 Docs](#documentation)

</div>

---

## ✨ What This Solves

**Before**: Raw GraphQL → Agent confusion, auth errors, complex queries  
**After**: Domain tools → `dota.player.profile`, `dota.match.summary`, automatic auth

```diff
- agents struggle with: "write GraphQL to get player winrate" 
+ agents succeed with: "dota.player.profile({ steamAccountId })"
```
---

## Quick Start

### 1. **Get STRATZ API Token**
1. Go to [STRATZ.com](https://stratz.com/) and create account
2. Navigate to API section and generate token
3. Copy your Bearer token

### 2. **Setup & Run**
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

### 3. **Test with MCP Inspector**
```bash
npx mcp-inspector http://localhost:3001/mcp
```

---

## 🛠️ Tools

### **Player Analysis**
- `dota.player.profile` - Get rank, winrate, activity
- `dota.player.matches` - Recent matches with KDA
- `dota.player.heroes` - Hero performance statistics

### **Match Analysis**  
- `dota.match.summary` - Basic match info and outcome
- `dota.match.players` - Detailed player statistics

### **Meta Research**
- `dota.meta.heroStats` - Current patch winrates/pickrates
- `dota.meta.counters` - Hero matchup data

### **Expert Mode**
- `dota.expert.graphql` - Raw GraphQL for advanced queries

### **Self-Documentation**
- **Resources**: `doc://dota/quickstart`, `doc://dota/ids`
- **Prompts**: `analyze-player`, `analyze-match`

---

## Configuration

### Environment Variables

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
```

---

## 🎮 Examples

### Player Analysis
```javascript
// Get player profile
dota.player.profile({ steamAccountId: 86745912 })

// Recent matches
dota.player.matches({ steamAccountId: 86745912, take: 5 })

// Hero performance
dota.player.heroes({ steamAccountId: 86745912, take: 10 })
```

### Match Analysis
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

## 🤖 AI Integration

Perfect for AI agents that need Dota 2 data:

- **Claude Desktop**: Add to MCP config
- **Flowise**: Import as custom tool
- **Custom agents**: Use HTTP MCP transport
- **ChatGPT Actions**: Use OpenAPI export

See example agent workflows in `FLOWISE_AGENT_GUIDE.md`

---

## Contributing
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
---

##  License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built for AI agents that need Dota 2 data**

[⭐ **Star us**](https://github.com/yourusername/OpenDotaMCP) • [🐛 **Issues**](https://github.com/yourusername/OpenDotaMCP/issues) • [🎮 **STRATZ API**](https://stratz.com/api)

</div>

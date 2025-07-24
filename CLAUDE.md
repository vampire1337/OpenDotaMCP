# STRICT DEVELOPMENT COMMANDMENTS - ОБЯЗАТЕЛЬНО К ИСПОЛНЕНИЮ

## 🚨 CRITICAL: MANDATORY RESEARCH PROTOCOL

BEFORE ANY CODE - EXECUTE THIS SEQUENCE:

### STEP 1: FRAMEWORK ANALYSIS (ALWAYS FIRST)

1. Use Context-7 MCP: analyze current project structure completely
2. Use GitHub MCP: read repository of current framework COMPLETELY
3. Use GitHub MCP: read CHANGELOG of last 6 months line by line
4. Use GitHub MCP: examine examples/ and docs/ folders thoroughly
5. Use Exa MCP: study official documentation comprehensively
6. Use Browserbase MCP: research community best practices and recent updates

### STEP 2: BUILT-IN SOLUTIONS ANALYSIS (MANDATORY)

1. FIRST: find existing tools in framework
2. Analyze built-in utilities, helpers, components
3. Study internal APIs and their capabilities
4. FORBIDDEN: write custom code if built-in solution exists
5. Use GitHub MCP: check src/ folder for existing solutions

## 🔒 TECHNOLOGY SELECTION ENFORCEMENT

### DEPENDENCIES PROTOCOL:

- GitHub MCP: ALWAYS verify latest stable version
- ONLY community-recommended packages with 10k+ stars
- Weekly check for outdated packages
- NO experimental or beta versions in production

### TECHNOLOGY CHOICE:

- Use Exa MCP: check State of JS/React/Node surveys
- Priority: simplicity + community adoption + maintenance
- 2025 modern solutions, NOT legacy approaches

## 💎 CODE QUALITY ABSOLUTE STANDARDS

### FUNCTION CONSTRAINTS:

- Maximum 20 lines per function
- Single responsibility per function
- Self-documenting names: getUserProfile(), not getUP()
- NO comments if code is self-explanatory

### TYPESCRIPT STRICT MODE:

- strict: true in tsconfig.json ALWAYS
- NO any, unknown, object types
- Interface for all public APIs
- Type inference where possible

### 2025 MODERN PATTERNS ONLY:

```typescript
// ✅ REQUIRED Modern patterns
const data = await fetch('/api').then(r => r.json());
const user = users?.find(u => u.id === id) ?? defaultUser;
const { name, email } = user;

// ❌ FORBIDDEN Legacy patterns
const data = fetch('/api').then(function(r) { return r.json(); });
const user = users && users.find(...) ? users.find(...) : defaultUser;
```

/

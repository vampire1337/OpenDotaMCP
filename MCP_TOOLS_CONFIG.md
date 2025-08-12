# 🛠️ MCP Tools Configuration для Dota 2 AgentFlow

## 📋 Обзор инструментов

Каждый агент в Dota 2 AgentFlow использует специфический набор MCP tools, оптимизированный для его задач:

| 🎯 **Agent** | 🔧 **Primary Tools** | 🆘 **Secondary Tools** | 📊 **Usage Priority** |
|-------------|---------------------|------------------------|---------------------|
| Master Coordinator | search-schema, query-graphql | debug-schema-status | Query routing & state management |
| Player Analyst | search-schema, query-graphql, introspect-type | get-query-examples | Deep player statistics |
| Match Analyst | search-schema, query-graphql | introspect-type | Match breakdown & analysis |
| Hero Meta Expert | search-schema, query-graphql, get-query-examples | introspect-type | Meta analysis & builds |
| Draft Coach | search-schema, query-graphql | get-query-examples | Team composition strategy |

---

## 🎯 Master Coordinator Tools

### **Назначение**: Анализ запросов и маршрутизация к специалистам

#### 🔍 **search-schema** (Priority: Critical)
```json
{
  "agentSelectedTool": "search-schema",
  "agentSelectedToolRequiresHumanInput": false,
  "description": "Поиск релевантных полей для определения типа запроса",
  "typical_keywords": [
    ["player", "steam", "account"],
    ["match", "duration", "winner"], 
    ["hero", "winrate", "meta"],
    ["draft", "pick", "ban"]
  ]
}
```

**Использование в промпте**:
```
Используй search-schema для определения доступных полей на основе пользовательского запроса.
Если пользователь упоминает Steam ID или статистику игрока → ищи ["player", "steam", "profile"]
Если пользователь упоминает Match ID или разбор матча → ищи ["match", "duration", "players"]
```

#### 📊 **query-graphql** (Priority: Critical)
```json
{
  "agentSelectedTool": "query-graphql", 
  "agentSelectedToolRequiresHumanInput": false,
  "description": "Выполнение простых запросов для валидации данных",
  "usage": "Быстрая проверка существования Steam ID или Match ID"
}
```

**Пример использования**:
```graphql
# Быстрая валидация Steam ID
query ValidatePlayer($steamId: Long!) {
  player(steamAccountId: $steamId) {
    steamAccount { name }
  }
}
```

#### 🐛 **debug-schema-status** (Priority: Helpful)
```json
{
  "agentSelectedTool": "debug-schema-status",
  "agentSelectedToolRequiresHumanInput": false,
  "description": "Диагностика проблем с подключением к API",
  "when_to_use": "Если search-schema или query-graphql возвращают ошибки"
}
```

---

## 📊 Player Analyst Tools

### **Назначение**: Глубокий анализ статистики и performance игроков

#### 🔍 **search-schema** (Priority: Critical)
```json
{
  "agentSelectedTool": "search-schema",
  "agentSelectedToolRequiresHumanInput": false,
  "description": "Поиск полей для анализа игроков",
  "specialized_keywords": [
    ["player", "steam", "winrate", "performance"],
    ["hero", "matchCount", "avgImp"],
    ["matches", "recent", "statistics"],
    ["rank", "tier", "leaderboard"],
    ["position", "role", "gpm", "xpm"]
  ]
}
```

**Workflow в промпте**:
```
1. Используй search-schema(keywords: ["player", "steam", "winrate"]) для базовых полей игрока
2. Затем search-schema(keywords: ["hero", "performance", "avgImp"]) для статистики по героям
3. Если нужна детализация: search-schema(keywords: ["matches", "recent", "items"])
```

#### 📊 **query-graphql** (Priority: Critical)
```json
{
  "agentSelectedTool": "query-graphql",
  "agentSelectedToolRequiresHumanInput": false,
  "description": "Основной инструмент получения данных игрока",
  "complex_queries": true,
  "variables_required": true
}
```

**Типичные запросы**:
```graphql
# Базовая статистика игрока
query PlayerStats($steamId: Long!) {
  player(steamAccountId: $steamId) {
    steamAccount { name avatar profileUri }
    matchCount winCount
    rank tier leaderboardRank
    
    heroesPerformance(take: 15) {
      hero { displayName }
      matchCount winCount
      avgImp avgGoldPerMinute avgExperiencePerMinute
      avgKills avgDeaths avgAssists
    }
    
    recentMatches(take: 20) {
      match { id durationSeconds didRadiantWin }
      hero { displayName }
      kills deaths assists networth level
      lane position
    }
  }
}

# Статистика по позициям
query PlayerPositionStats($steamId: Long!) {
  player(steamAccountId: $steamId) {
    positionStats {
      position matchCount winCount
      avgGoldPerMinute avgExperiencePerMinute
    }
  }
}
```

#### 🔎 **introspect-type** (Priority: High)
```json
{
  "agentSelectedTool": "introspect-type",
  "agentSelectedToolRequiresHumanInput": false,
  "description": "Изучение структуры PlayerType для глубокого анализа",
  "typical_types": ["PlayerType", "HeroPerformanceType", "MatchType"],
  "maxDepth": 2
}
```

#### 📚 **get-query-examples** (Priority: Helpful)
```json
{
  "agentSelectedTool": "get-query-examples",
  "agentSelectedToolRequiresHumanInput": false,
  "description": "Шаблоны запросов для анализа игроков",
  "category_filter": "player_analysis"
}
```

---

## ⚔️ Match Analyst Tools

### **Назначение**: Детальный разбор матчей и игровых моментов

#### 🔍 **search-schema** (Priority: Critical)
```json
{
  "agentSelectedTool": "search-schema",
  "agentSelectedToolRequiresHumanInput": false,
  "description": "Поиск полей для анализа матчей",
  "specialized_keywords": [
    ["match", "duration", "winner", "players"],
    ["draft", "pickBans", "hero", "order"],
    ["items", "builds", "networth", "level"],
    ["damage", "kills", "assists", "deaths"],
    ["tower", "barracks", "team", "economy"]
  ]
}
```

**Поэтапный поиск**:
```
Phase 1: search-schema(keywords: ["match", "duration", "didRadiantWin"])
Phase 2: search-schema(keywords: ["players", "hero", "kills", "items"]) 
Phase 3: search-schema(keywords: ["pickBans", "draft", "order"])
Phase 4: search-schema(keywords: ["damage", "networth", "economy"])
```

#### 📊 **query-graphql** (Priority: Critical)
```json
{
  "agentSelectedTool": "query-graphql",
  "agentSelectedToolRequiresHumanInput": false,
  "description": "Комплексные запросы для анализа матчей",
  "supports_nested_queries": true,
  "large_result_sets": true
}
```

**Специализированные запросы**:
```graphql
# Полный анализ матча
query MatchAnalysis($matchId: Long!) {
  match(id: $matchId) {
    id durationSeconds didRadiantWin
    gameMode averageRank
    
    # Draft информация
    pickBans {
      heroId isPick bannedHeroId order
    }
    
    # Детальная статистика игроков
    players {
      steamAccount { name }
      hero { displayName }
      kills deaths assists
      networth level
      goldPerMinute experiencePerMinute
      
      # Предметы и билды
      items { 
        displayName cost isNeutral tier
      }
      
      # Позиция и урон
      lane position
      heroDamage towerDamage heroHealing
      
      # Фарм статистика
      lastHits denies creepScore neutralScore
    }
    
    # Командная статистика
    radiantTeam {
      towerKills barracksKills
      totalGold totalExperience
    }
    direTeam {
      towerKills barracksKills
      totalGold totalExperience  
    }
  }
}

# Анализ экономики по времени
query MatchEconomy($matchId: Long!) {
  match(id: $matchId) {
    players {
      hero { displayName }
      networthPerMinute
      goldPerMinute
      experiencePerMinute
    }
  }
}
```

#### 🔎 **introspect-type** (Priority: Helpful)  
```json
{
  "agentSelectedTool": "introspect-type",
  "agentSelectedToolRequiresHumanInput": false,
  "description": "Изучение MatchType структуры",
  "focus_types": ["MatchType", "PlayerMatchType", "PickBanType"],
  "maxDepth": 2
}
```

---

## 🦸 Hero Meta Expert Tools

### **Назначение**: Мета-анализ героев, билды и статистика по патчам

#### 🔍 **search-schema** (Priority: Critical)
```json
{
  "agentSelectedTool": "search-schema", 
  "agentSelectedToolRequiresHumanInput": false,
  "description": "Поиск мета-полей для героев",
  "specialized_keywords": [
    ["hero", "winrate", "pickrate", "banrate"],
    ["meta", "popularity", "statistics"],
    ["matchups", "synergy", "counter"],
    ["builds", "items", "skills"],
    ["position", "role", "effectiveness"]
  ]
}
```

**Мета-анализ workflow**:
```
Step 1: search-schema(keywords: ["hero", "winrate", "pickrate"]) - базовая статистика
Step 2: search-schema(keywords: ["matchups", "versus", "advantage"]) - матчапы
Step 3: search-schema(keywords: ["synergy", "with", "teamfight"]) - синергии
Step 4: search-schema(keywords: ["builds", "items", "popular"]) - билды
```

#### 📊 **query-graphql** (Priority: Critical)
```json
{
  "agentSelectedTool": "query-graphql",
  "agentSelectedToolRequiresHumanInput": false,
  "description": "Комплексные мета-запросы",
  "statistical_analysis": true,
  "hero_comparisons": true
}
```

**Мета-запросы**:
```graphql
# Полный мета-анализ героя
query HeroMetaAnalysis($heroId: Short!) {
  heroStats {
    hero(id: $heroId) {
      displayName
      winRate pickRate banRate
      averageStats {
        goldPerMinute experiencePerMinute
        killsPerGame deathsPerGame assistsPerGame
      }
    }
    
    # Матчапы против других героев
    matchups(heroId: $heroId) {
      versus { displayName }
      winRate laneWinRate
      matchCount advantage
    }
    
    # Синергии с союзниками  
    synergies(heroId: $heroId) {
      with { displayName }
      winRate matchCount
      synergyStrength
    }
    
    # Статистика по позициям
    positionStats(heroId: $heroId) {
      position winRate pickRate
      averageStats {
        goldPerMinute experiencePerMinute
        killsPerGame deathsPerGame assistsPerGame
      }
    }
  }
  
  # Популярные билды
  itemBuilds(heroId: $heroId) {
    popularBuilds {
      items { 
        displayName cost
        winRate buildRate
      }
      situation averageGameTime
      skillBuild
    }
    
    situationalItems {
      item { displayName }
      vsHeroes winRateImprovement
      situation
    }
  }
}

# Сравнительный анализ героев
query HeroComparison($heroIds: [Short!]!) {
  heroStats {
    heroes(ids: $heroIds) {
      displayName winRate pickRate
      averageStats { killsPerGame deathsPerGame }
    }
  }
}
```

#### 📚 **get-query-examples** (Priority: High)
```json
{
  "agentSelectedTool": "get-query-examples",
  "agentSelectedToolRequiresHumanInput": false,
  "description": "Шаблоны для мета-анализа",
  "categories": ["hero_analysis", "meta_trends", "item_builds"]
}
```

#### 🔎 **introspect-type** (Priority: Helpful)
```json
{
  "agentSelectedTool": "introspect-type", 
  "agentSelectedToolRequiresHumanInput": false,
  "description": "Структура HeroStatsType",
  "focus_types": ["HeroStatsType", "MatchupType", "ItemBuildType"],
  "maxDepth": 2
}
```

---

## 🎪 Draft Coach Tools

### **Назначение**: Стратегические советы по драфту и командным составам

#### 🔍 **search-schema** (Priority: Critical)
```json
{
  "agentSelectedTool": "search-schema",
  "agentSelectedToolRequiresHumanInput": false,
  "description": "Поиск полей для анализа драфта",
  "specialized_keywords": [
    ["hero", "synergy", "teamfight", "composition"],
    ["counter", "matchup", "advantage", "weakness"],
    ["draft", "pick", "ban", "priority"],
    ["team", "strategy", "timing", "execution"],
    ["position", "role", "coverage", "balance"]
  ]
}
```

**Драфт-анализ workflow**:
```
Phase 1: search-schema(keywords: ["hero", "synergy", "with"]) - синергии
Phase 2: search-schema(keywords: ["counter", "versus", "advantage"]) - контр-пики
Phase 3: search-schema(keywords: ["team", "composition", "balance"]) - баланс команды
Phase 4: search-schema(keywords: ["timing", "window", "execution"]) - тайминги
```

#### 📊 **query-graphql** (Priority: Critical)
```json
{  
  "agentSelectedTool": "query-graphql",
  "agentSelectedToolRequiresHumanInput": false,
  "description": "Комплексные запросы для драфт-анализа",
  "team_analysis": true,
  "multi_hero_queries": true
}
```

**Драфт-запросы**:
```graphql
# Анализ командной синергии
query TeamSynergies($heroIds: [Short!]!) {
  teamSynergies(heroIds: $heroIds) {
    synergyStrength
    winRate matchCount
    synergyType
    keyTimings
  }
  
  # Композиция команды
  teamComposition(heroIds: $heroIds) {
    winConditions
    timingWindows  
    executionDifficulty
    roleBalance
    damageDistribution
  }
}

# Контр-анализ против вражеской команды
query CounterAnalysis($enemyHeroIds: [Short!]!) {
  heroCounters(enemyHeroIds: $enemyHeroIds) {
    counter { displayName }
    winRate advantage
    counterType
    effectiveness
  }
}

# Рекомендации по пикам
query PickRecommendations(
  $alliedHeroes: [Short!]!,
  $enemyHeroes: [Short!]!,
  $position: Int!
) {
  heroRecommendations(
    alliedHeroes: $alliedHeroes,
    enemyHeroes: $enemyHeroes, 
    position: $position
  ) {
    hero { displayName }
    matchScore
    reasons
    situationalFactors
  }
}
```

#### 📚 **get-query-examples** (Priority: High)
```json
{
  "agentSelectedTool": "get-query-examples",
  "agentSelectedToolRequiresHumanInput": false,
  "description": "Шаблоны для драфт-стратегий",
  "categories": ["draft_strategy", "team_composition", "counter_picks"]
}
```

---

## 🔧 Настройка Tools в Flowise

### **Шаг 1: Подключение MCP Server**
```json
{
  "name": "opendota-mcp",
  "serverUrl": "http://localhost:3001/mcp",
  "timeout": 30000,
  "retries": 3,
  "description": "Dota 2 GraphQL API via MCP"
}
```

### **Шаг 2: Конфигурация для каждого агента**

#### Master Coordinator:
```json
{
  "agentTools": [
    {
      "agentSelectedTool": "search-schema",
      "agentSelectedToolRequiresHumanInput": false
    },
    {
      "agentSelectedTool": "query-graphql", 
      "agentSelectedToolRequiresHumanInput": false
    },
    {
      "agentSelectedTool": "debug-schema-status",
      "agentSelectedToolRequiresHumanInput": false
    }
  ]
}
```

#### Player Analyst:
```json
{
  "agentTools": [
    {
      "agentSelectedTool": "search-schema",
      "agentSelectedToolRequiresHumanInput": false
    },
    {
      "agentSelectedTool": "query-graphql",
      "agentSelectedToolRequiresHumanInput": false
    },
    {
      "agentSelectedTool": "introspect-type",
      "agentSelectedToolRequiresHumanInput": false
    },
    {
      "agentSelectedTool": "get-query-examples",
      "agentSelectedToolRequiresHumanInput": false
    }
  ]
}
```

#### Match Analyst:
```json
{
  "agentTools": [
    {
      "agentSelectedTool": "search-schema",
      "agentSelectedToolRequiresHumanInput": false
    },
    {
      "agentSelectedTool": "query-graphql",
      "agentSelectedToolRequiresHumanInput": false
    },
    {
      "agentSelectedTool": "introspect-type", 
      "agentSelectedToolRequiresHumanInput": false
    }
  ]
}
```

#### Hero Meta Expert:
```json
{
  "agentTools": [
    {
      "agentSelectedTool": "search-schema",
      "agentSelectedToolRequiresHumanInput": false
    },
    {
      "agentSelectedTool": "query-graphql",
      "agentSelectedToolRequiresHumanInput": false
    },
    {
      "agentSelectedTool": "get-query-examples",
      "agentSelectedToolRequiresHumanInput": false
    },
    {
      "agentSelectedTool": "introspect-type",
      "agentSelectedToolRequiresHumanInput": false
    }
  ]
}
```

#### Draft Coach:
```json
{
  "agentTools": [
    {
      "agentSelectedTool": "search-schema",
      "agentSelectedToolRequiresHumanInput": false
    },
    {
      "agentSelectedTool": "query-graphql",
      "agentSelectedToolRequiresHumanInput": false
    },
    {
      "agentSelectedTool": "get-query-examples",
      "agentSelectedToolRequiresHumanInput": false
    }
  ]
}
```

### **Шаг 3: Проверка подключения**
```bash
# Тест MCP tools через inspector
npx mcp-inspector http://localhost:3001/mcp

# Проверка в Flowise
# Settings → Tools → Verify MCP Connection
```

---

## 🚨 Troubleshooting Tools

### **Проблема**: Агент не видит MCP tools
**Решение**:
1. Проверь статус MCP Server: `curl http://localhost:3001/mcp`
2. Перезагрузи Flowise: `docker restart flowise`
3. Проверь конфигурацию MCP в Settings

### **Проблема**: search-schema возвращает пустые результаты  
**Решение**:
1. Используй debug-schema-status для диагностики
2. Проверь индексацию схемы в логах MCP Server
3. Перезапусти MCP Server: `docker compose restart`

### **Проблема**: query-graphql падает с ошибками
**Решение**:  
1. Проверь формат variables: должен быть строкой JSON
2. Используй introspect-type для проверки структуры
3. Проверь доступность GraphQL endpoint

### **Проблема**: Медленные ответы от API
**Решение**:
1. Уменьши maxResults в search-schema 
2. Используй maxDepth=1 в introspect-type
3. Оптимизируй GraphQL запросы - запрашивай только нужные поля

---

## 📊 Метрики использования Tools

| Tool | Master Coordinator | Player Analyst | Match Analyst | Hero Meta Expert | Draft Coach |
|------|-------------------|----------------|---------------|------------------|-------------|
| **search-schema** | 95% | 90% | 85% | 95% | 90% |
| **query-graphql** | 80% | 95% | 95% | 90% | 85% |
| **introspect-type** | 20% | 70% | 50% | 60% | 30% |
| **get-query-examples** | 10% | 40% | 20% | 70% | 60% |
| **debug-schema-status** | 30% | 10% | 15% | 10% | 5% |

---

## 🎯 Best Practices

### **Оптимизация производительности**:
1. **Всегда начинай с search-schema** - это самый быстрый способ найти нужные поля
2. **Используй maxDepth=1-2** в introspect-type для избежания глубокой рекурсии
3. **Кэшируй результаты** search-schema в рамках одной сессии
4. **Запрашивай только нужные поля** в GraphQL queries

### **Обработка ошибок**:
1. **Graceful degradation** - если MCP tool недоступен, дай частичный ответ
2. **Retry logic** - повтори запрос с уменьшенными параметрами
3. **Fallback queries** - используй более простые запросы при ошибках
4. **User feedback** - объясни пользователю проблемы с API

### **Безопасность**:
1. **Никогда не логируй** Steam ID или личные данные игроков
2. **Валидируй входные данные** перед GraphQL запросами  
3. **Ограничивай размер результатов** для предотвращения DoS
4. **Используй rate limiting** для защиты API

---

**🎮 Результат: Каждый агент имеет оптимальный набор MCP tools для своих задач, обеспечивая максимальную эффективность и точность анализа Dota 2 данных!**
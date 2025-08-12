# 🎮 Полный гайд по Dota 2 AgentFlow в Flowise

## 📋 Содержание

1. [Архитектура агентской системы](#архитектура-агентской-системы)
2. [Конфигурация MCP Tools](#конфигурация-mcp-tools) • [📋 Детальная конфигурация Tools](MCP_TOOLS_CONFIG.md)
3. [Настройка каждого агента](#настройка-каждого-агента)
4. [Flow State Management](#flow-state-management)
5. [Пошаговая установка](#пошаговая-установка)
6. [Troubleshooting](#troubleshooting)
7. [Примеры использования](#примеры-использования)

---

## 🏗️ Архитектура агентской системы

### Общая схема workflow:

```
User Query → Start Node → Master Coordinator → Analysis Router → Specialist Agent → Response Synthesizer → Final Answer
```

### Компоненты системы:

#### 🎯 **Master Coordinator**

- **Роль**: Главный маршрутизатор и координатор
- **Задачи**: Анализ запросов, извлечение параметров, управление Flow State
- **Специализация**: Определение типа анализа (player/match/hero/draft)

#### 📊 **Player Analyst**

- **Роль**: Специалист по анализу игроков
- **Задачи**: Статистика игроков, анализ performance, рекомендации
- **Данные**: Steam ID, винрейт, герои, экономические показатели

#### ⚔️ **Match Analyst**

- **Роль**: Эксперт по разбору матчей
- **Задачи**: Анализ драфта, игровых фаз, поворотных моментов
- **Данные**: Match ID, детали игры, статистика команд

#### 🦸 **Hero Meta Expert**

- **Роль**: Мета-аналитик героев
- **Задачи**: Анализ героев в патче, билды, контр-пики
- **Данные**: Статистика героев, винрейт, популярность

#### 🎪 **Draft Coach**

- **Роль**: Тренер по драфту
- **Задачи**: Советы по пикам/банам, командные синергии
- **Данные**: Композиции команд, матчапы, стратегии

#### 🔀 **Analysis Router**

- **Роль**: Условный маршрутизатор
- **Задачи**: Направление к нужному специалисту
- **Логика**: На основе `$flow.state.analysisType`

#### 💎 **Response Synthesizer**

- **Роль**: Финальный синтезатор ответов
- **Задачи**: Объединение результатов, структурирование ответа
- **Формат**: Понятный и действенный ответ пользователю

---

## 🛠️ Конфигурация MCP Tools

### **Подключение OpenDota MCP Server**

#### 1. Настройка MCP в Flowise:

```json
{
  "name": "opendota-mcp",
  "serverUrl": "http://localhost:3001/mcp",
  "description": "OpenDota/Stratz GraphQL API integration",
  "timeout": 30000,
  "retries": 3,
  "transport": "http"
}
```

#### 2. Доступные MCP Tools:

##### 🔍 **search-schema**

```json
{
  "name": "search-schema",
  "description": "🔍 ВСЕГДА НАЧИНАЙ ЗДЕСЬ: Поиск полей в GraphQL схеме",
  "parameters": {
    "keywords": ["array", "string"],
    "maxResults": ["number", "optional", "default: 10"]
  },
  "usage": "Поиск полей по ключевым словам"
}
```

##### 🔎 **introspect-type**

```json
{
  "name": "introspect-type",
  "description": "Детальная информация о типе GraphQL",
  "parameters": {
    "typeName": ["string", "required"],
    "maxDepth": ["number", "optional", "default: 2"]
  },
  "usage": "Изучение структуры конкретного типа"
}
```

##### 📊 **query-graphql**

```json
{
  "name": "query-graphql", 
  "description": "Выполнение GraphQL запросов к API",
  "parameters": {
    "query": ["string", "required"],
    "variables": ["string", "optional", "JSON format"]
  },
  "usage": "Основной инструмент получения данных"
}
```

##### 🐛 **debug-schema-status**

```json
{
  "name": "debug-schema-status",
  "description": "Диагностика состояния схемы",
  "parameters": {},
  "usage": "Troubleshooting проблем с API"
}
```

##### 📚 **get-query-examples**

```json
{
  "name": "get-query-examples",
  "description": "Примеры готовых запросов",
  "parameters": {
    "category": ["string", "optional"]
  },
  "usage": "Шаблоны для типичных запросов"
}
```

---

## 🔧 Настройка каждого агента

### 🎯 **Master Coordinator Configuration**

#### Model Settings:

```json
{
  "agentModel": "claude-3-5-sonnet-20241022",
  "temperature": 0.3,
  "maxTokens": 4000
}
```

#### Required Tools:

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

#### Memory Configuration:V

```json
{
  "agentEnableMemory": true,
  "agentMemoryType": "conversationSummary",
  "agentMemoryWindowSize": 15
}
```

---

### 📊 **Player Analyst Configuration**

#### Model Settings:

```json
{
  "agentModel": "claude-3-5-sonnet-20241022",
  "temperature": 0.2,
  "maxTokens": 3000
}
```

#### Required Tools:

```json
{
  "agentTools": [
    {
      "agentSelectedTool": "search-schema",
      "agentSelectedToolRequiresHumanInput": false,
      "priority": "essential"
    },
    {
      "agentSelectedTool": "query-graphql",
      "agentSelectedToolRequiresHumanInput": false,
      "priority": "essential"
    },
    {
      "agentSelectedTool": "introspect-type",
      "agentSelectedToolRe iresHumanInput": false,
      "priority": "helpful"
    },
    {
      "agentSelectedTool": "get-query-examples",
      "agentSelectedToolRequiresHumanInput": false,
      "priority": "helpful"
    }
  ]
}
```

#### Специализированные запросы:

```graphql
# Основной запрос игрока
query PlayerAnalysis($steamId: Long!) {
  player(steamAccountId: $steamId) {
    steamAccount { 
      name avatar 
      profileUri lastLoggedOn
    }
    matchCount winCount
    rank tier leaderboardRank
  
    # Performance по героям
    heroesPerformance(take: 15) {
      hero { displayName }
      matchCount winCount
      avgImp avgGoldPerMinute avgExperiencePerMinute
      avgKills avgDeaths avgAssists
    }
  
    # Последние матчи
    recentMatches(take: 20) {
      match { 
        id durationSeconds didRadiantWin
        gameMode averageRank
      }
      hero { displayName }
      kills deaths assists
      networth level
      lane position
    }
  
    # Статистика по позициям
    positionStats {
      position matchCount winCount
      avgGoldPerMinute avgExperiencePerMinute
    }
  }
}
```

#### Memory Configuration:

```json
{
  "agentEnableMemory": true,
  "agentMemoryType": "windowSize",
  "agentMemoryWindowSize": 10
}
```

---

### ⚔️ **Match Analyst Configuration**

#### Model Settings:

```json
{
  "agentModel": "claude-3-5-sonnet-20241022",
  "temperature": 0.25,
  "maxTokens": 4000
}
```

#### Required Tools:

```json
{
  "agentTools": [
    {
      "agentSelectedTool": "search-schema",
      "agentSelectedToolRequiresHumanInput": false,
      "keywords_preset": ["match", "duration", "players", "items", "economy"]
    },
    {
      "agentSelectedTool": "query-graphql",
      "agentSelectedToolRequiresHumanInput": false,
      "context": "match_analysis"
    },
    {
      "agentSelectedTool": "introspect-type",
      "agentSelectedToolRequiresHumanInput": false,
      "focus": "MatchType"
    }
  ]
}
```

#### Специализированные запросы:

```graphql
# Детальный анализ матча
query MatchAnalysis($matchId: Long!) {
  match(id: $matchId) {
    id durationSeconds didRadiantWin
    gameMode averageRank
  
    # Информация о драфте
    pickBans {
      heroId isPick bannedHeroId
      order
    }
  
    # Игроки и их performance
    players {
      steamAccount { name }
      hero { displayName }
      kills deaths assists
      networth level
      goldPerMinute experiencePerMinute
    
      # Предметы
      items { 
        displayName cost 
        isNeutral tier
      }
    
      # Позиция и лайн
      lane position
    
      # Урон и статистика
      heroDamage towerDamage
      heroHealing supportGoldSpent
    
      # Фарм статистика
      lastHits denies
      creepScore neutralScore
    }
  
    # Статистика команд
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
```

#### Memory Configuration:

```json
{
  "agentEnableMemory": true,
  "agentMemoryType": "windowSize", 
  "agentMemoryWindowSize": 5
}
```

---

### 🦸 **Hero Meta Expert Configuration**

#### Model Settings:

```json
{
  "agentModel": "claude-3-5-sonnet-20241022",
  "temperature": 0.1,
  "maxTokens": 3500
}
```

#### Required Tools:

```json
{
  "agentTools": [
    {
      "agentSelectedTool": "search-schema",
      "agentSelectedToolRequiresHumanInput": false,
      "keywords_preset": ["hero", "winrate", "popularity", "meta", "builds"]
    },
    {
      "agentSelectedTool": "query-graphql",
      "agentSelectedToolRequiresHumanInput": false,
      "context": "hero_meta"
    },
    {
      "agentSelectedTool": "get-query-examples",
      "agentSelectedToolRequiresHumanInput": false,
      "category": "hero_analysis"
    },
    {
      "agentSelectedTool": "introspect-type",
      "agentSelectedToolRequiresHumanInput": false,
      "focus": "HeroStatsType"
    }
  ]
}
```

#### Специализированные запросы:

```graphql
# Мета-анализ героя
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
      matchCount
      advantage
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
```

#### Memory Configuration:

```json
{
  "agentEnableMemory": true,
  "agentMemoryType": "conversationSummary",
  "summarizeEvery": 8
}
```

---

### 🎪 **Draft Coach Configuration**

#### Model Settings:

```json
{
  "agentModel": "claude-3-5-sonnet-20241022",
  "temperature": 0.15,
  "maxTokens": 3000
}
```

#### Required Tools:

```json
{
  "agentTools": [
    {
      "agentSelectedTool": "search-schema",
      "agentSelectedToolRequiresHumanInput": false,
      "keywords_preset": ["hero", "synergy", "counter", "draft", "composition"]
    },
    {
      "agentSelectedTool": "query-graphql",
      "agentSelectedToolRequiresHumanInput": false,
      "context": "draft_analysis"
    },
    {
      "agentSelectedTool": "get-query-examples",
      "agentSelectedToolRequiresHumanInput": false,
      "category": "draft_strategy"
    }
  ]
}
```

#### Специализированные запросы:

```graphql
# Анализ драфта и рекомендации
query DraftAnalysis($alliedHeroes: [Short!]!, $enemyHeroes: [Short!]!) {
  # Синергии союзной команды
  teamSynergies(heroIds: $alliedHeroes) {
    synergyStrength
    winRate matchCount
    synergyType
    keyTimings
  }
  
  # Анализ против вражеской команды
  heroCounters(enemyHeroIds: $enemyHeroes) {
    counter { displayName }
    winRate advantage
    counterType
    effectiveness
  }
  
  # Композиция команды
  teamComposition(heroIds: $alliedHeroes) {
    winConditions
    timingWindows
    executionDifficulty
    roleBalance
    damageDistribution
  }
  
  # Рекомендации по пикам
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

#### Memory Configuration:

```json
{
  "agentEnableMemory": true,
  "agentMemoryType": "allMessages"
}
```

---

## 🗂️ Flow State Management

### Структура Flow State:

```json
{
  "analysisType": "",     // "player" | "match" | "hero" | "draft"
  "steamId": "",         // Steam ID для анализа игроков
  "matchId": "",         // Match ID для анализа матчей  
  "heroName": "",        // Имя героя для мета-анализа
  "currentPatch": "7.37d", // Текущий патч игры
  "queryData": "{}"      // Дополнительные данные запроса
}
```

### Использование в агентах:

#### В Master Coordinator:

```javascript
// Обновление состояния на основе анализа запроса
if (userQuery.includes("steam") || /\d{8,}/.test(userQuery)) {
  $flow.state.analysisType = "player";
  $flow.state.steamId = extractSteamId(userQuery);
}

if (userQuery.includes("матч") || /match.*\d{10}/.test(userQuery)) {
  $flow.state.analysisType = "match";
  $flow.state.matchId = extractMatchId(userQuery);
}
```

#### В специализированных агентах:

```javascript
// Получение данных из состояния
const steamId = $flow.state.steamId;
const analysisType = $flow.state.analysisType;

// Формирование запроса на основе состояния
const query = buildQueryForAnalysisType(analysisType, {
  steamId: $flow.state.steamId,
  matchId: $flow.state.matchId,
  heroName: $flow.state.heroName
});
```

---

## 📋 Пошаговая установка

### Шаг 1: Подготовка MCP Server

```bash
# Запуск OpenDota MCP Server
cd OpenDotaMCP
docker compose up -d

# Проверка работоспособности
curl http://localhost:3001/health
curl http://localhost:3001/mcp
```

### Шаг 2: Настройка Flowise

```bash
# Установка Flowise
npm install -g flowise

# Или через Docker
docker run -d \
  --name flowise \
  -p 3000:3000 \
  -v ~/.flowise:/root/.flowise \
  flowiseai/flowise
```

### Шаг 3: Подключение MCP Server

1. Открой Flowise UI: `http://localhost:3000`
2. Перейди в **Settings → Tools & Integrations**
3. Добавь MCP Server:

```json
{
  "name": "opendota-mcp",
  "serverUrl": "http://host.docker.internal:3001/mcp",
  "timeout": 30000,
  "description": "Dota 2 API Integration"
}
```

### Шаг 4: Импорт AgentFlow

1. Перейди в **Agents → Import**
2. Загрузи файл `Stratz_Agents_Dota2.json`
3. Проверь подключение всех MCP tools
4. Настрой модели для каждого агента

### Шаг 5: Тестирование

```
Тестовые запросы:
- "Проанализируй игрока 123456789"
- "Разбери матч 7891234567"  
- "Как играется Pudge в мете?"
- "Что пикать против Invoker + Magnus?"
```

---

## 🚨 Troubleshooting

### Проблема: MCP Tools не подключаются

**Решение:**

```bash
# Проверь доступность MCP Server
curl -v http://localhost:3001/mcp

# Проверь логи Docker
docker logs opendotamcp

# Перезапуск сервисов
docker compose restart
```

### Проблема: Агенты не получают данные

**Решение:**

1. Проверь schema indexing:

```bash
# Через MCP Inspector
npx mcp-inspect http://localhost:3001/mcp
```

2. Проверь debug-schema-status tool в агенте
3. Убедись что `search-schema` находит нужные поля

### Проблема: Flow State не обновляется

**Решение:**

1. Проверь настройку `startPersistState: true`
2. Убедись что Master Coordinator правильно обновляет состояние
3. Проверь логи Flowise на ошибки

### Проблема: Запросы GraphQL падают с ошибками

**Решение:**

1. Проверь формат variables в query-graphql:

```json
{
  "query": "query($steamId: Long!) { ... }",
  "variables": "{\"steamId\": 123456789}"
}
```

2. Используй introspect-type для проверки схемы
3. Проверь актуальность эндпоинта API

---

## 💡 Примеры использования

### Анализ игрока:

```
Пользователь: "Проанализируй мою игру, Steam ID 76561198057193106"

Workflow:
1. Master Coordinator извлекает Steam ID, устанавливает analysisType="player"
2. Analysis Router направляет к Player Analyst
3. Player Analyst выполняет GraphQL запросы через MCP tools
4. Response Synthesizer создает итоговый анализ

Результат: Детальный анализ со статистикой, сильными/слабыми сторонами и рекомендациями
```

### Анализ матча:

```
Пользователь: "Разбери матч 7891234567, почему мы проиграли?"

Workflow:
1. Master Coordinator извлекает Match ID, устанавливает analysisType="match"
2. Analysis Router направляет к Match Analyst  
3. Match Analyst анализирует драфт, игровые фазы, статистику
4. Response Synthesizer структурирует разбор матча

Результат: Профессиональный разбор с анализом драфта, ключевых моментов и рекомендациями
```

### Мета-анализ героя:

```
Пользователь: "Как сейчас стоит Pudge в 7.37d патче?"

Workflow:
1. Master Coordinator определяет heroName="Pudge", analysisType="hero"
2. Analysis Router направляет к Hero Meta Expert
3. Hero Meta Expert анализирует статистику, билды, матчапы
4. Response Synthesizer создает мета-отчет

Результат: Полный мета-анализ с винрейтом, билдами, позиционированием и прогнозами
```

### Драфт-советы:

```
Пользователь: "У нас Invoker mid и Crystal Maiden sup, что пикать на керри?"

Workflow:
1. Master Coordinator парсит состав команды, analysisType="draft"
2. Analysis Router направляет к Draft Coach
3. Draft Coach анализирует синергии и рекомендует пики
4. Response Synthesizer форматирует советы по драфту

Результат: Топ-3 рекомендации с обоснованием, синергиями и альтернативами
```

---

## 🏆 Результат

Этот AgentFlow представляет собой **революционную систему анализа Dota 2**, которая:

- ✅ **Использует реальные данные** из OpenDota/Stratz API через MCP
- ✅ **Специализированные агенты** для каждого типа анализа
- ✅ **Профессиональный уровень** экспертизы в каждой области
- ✅ **Интеллектуальная маршрутизация** запросов
- ✅ **Структурированные ответы** с конкретными рекомендациями
- ✅ **Полная интеграция** с Flowise AgentFlow V2

**Это не просто чат-бот, а персональный Dota 2 тренер мирового класса! 🚀**

---

## 📋 Дополнительные ресурсы

- **[MCP Tools Configuration](MCP_TOOLS_CONFIG.md)** - Детальная настройка инструментов для каждого агента
- **[Готовый AgentFlow JSON](Stratz_Agents_Dota2.json)** - Полностью настроенная конфигурация для импорта
- **[Системные промпты](flowise/system-prompts.md)** - Все промпты агентов в отдельном файле
- **[Расширенные системы](flowise/advanced-systems.md)** - Продвинутые алгоритмы анализа

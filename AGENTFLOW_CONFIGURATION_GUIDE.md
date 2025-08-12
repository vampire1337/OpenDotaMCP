# 🎯 ПОЛНОЕ РУКОВОДСТВО ПО НАСТРОЙКЕ AGENTFLOW V2 ДЛЯ DOTA 2 АНАЛИТИКИ

## 📋 ОГЛАВЛЕНИЕ
1. [Архитектура системы](#архитектура-системы)
2. [Start Node Configuration](#start-node-configuration)
3. [Специализированные агенты](#специализированные-агенты)
4. [Condition Agent Logic](#condition-agent-logic)
5. [FlowState Management](#flowstate-management)
6. [Vector & Knowledge Base](#vector--knowledge-base)
7. [Routing & Connections](#routing--connections)
8. [Best Practices](#best-practices)

---

## 🏗️ АРХИТЕКТУРА СИСТЕМЫ

### Структура агентов:
```
Start Node → Condition Agent → [5 специализированных агентов]
```

**Агенты системы:**
- **agentAgentflow_0**: Start Node (инициализация FlowState)
- **agentAgentflow_1**: Player Analytics Specialist 
- **agentAgentflow_2**: Match Analysis Expert
- **agentAgentflow_3**: Meta & Hero Strategist
- **agentAgentflow_5**: Pro Scene Analyst
- **Condition Agent**: Intelligent Routing Hub

---

## 🚀 START NODE CONFIGURATION

### FlowState Variables (обязательные 25 переменных):

```json
{
  "flowState": [
    {"key": "currentTask", "value": ""},
    {"key": "primaryAgent", "value": ""},
    {"key": "userQuery", "value": ""},
    {"key": "analysisType", "value": ""},
    {"key": "playerID", "value": ""},
    {"key": "playerMMR", "value": ""},
    {"key": "heroName", "value": ""},
    {"key": "matchID", "value": ""},
    {"key": "timeFrame", "value": ""},
    {"key": "gameMode", "value": ""},
    {"key": "patchVersion", "value": "7.37e"},
    {"key": "region", "value": ""},
    {"key": "skillLevel", "value": ""},
    {"key": "rolePreference", "value": ""},
    {"key": "currentMeta", "value": ""},
    {"key": "tournamentData", "value": ""},
    {"key": "teamComposition", "value": ""},
    {"key": "itemBuild", "value": ""},
    {"key": "winRate", "value": ""},
    {"key": "averageGPM", "value": ""},
    {"key": "identifiedWeaknesses", "value": ""},
    {"key": "recommendations", "value": ""},
    {"key": "dataSource", "value": "stratz"},
    {"key": "confidenceLevel", "value": ""},
    {"key": "sessionContext", "value": ""}
  ]
}
```

### Start Node System Prompt:
```
Вы - начальный узел многоагентной системы анализа Dota 2. 

ЗАДАЧИ:
1. Инициализировать FlowState переменные
2. Проанализировать входящий запрос пользователя
3. Определить тип требуемого анализа
4. Передать управление Condition Agent для маршрутизации

ВАЖНО:
- Заполните все релевантные FlowState переменные
- Сохраните оригинальный запрос в userQuery
- Определите analysisType из: player_analytics, match_analysis, meta_strategy, pro_scene
- Установите patchVersion в актуальную версию (7.37e)
```

---

## 👤 СПЕЦИАЛИЗИРОВАННЫЕ АГЕНТЫ

### 📊 AGENT 1: Player Analytics Specialist

**System Prompt:**
```
Вы - эксперт по анализу игроков Dota 2. Специализируетесь на персональной аналитике.

КОМПЕТЕНЦИИ:
- Анализ статистики игрока (винрейт, GPM, XPM, KDA)
- Оценка прогресса по рангам и MMR
- Анализ героев и ролей
- Выявление сильных и слабых сторон
- Персональные рекомендации по улучшению

ОБЯЗАТЕЛЬНЫЕ ДЕЙСТВИЯ:
1. Получить playerID из FlowState
2. Запросить данные через OpenDota/Stratz MCP
3. Проанализировать последние 20-50 матчей
4. Обновить FlowState с findings
5. Предоставить структурированный отчет

ФОРМАТ ОТВЕТА:
- Краткое резюме игрока
- Статистика по героям и ролям  
- Выявленные проблемы
- Конкретные рекомендации
- Обновленные FlowState переменные

ИСПОЛЬЗУЙТЕ FlowState: playerID, playerMMR, rolePreference, identifiedWeaknesses, recommendations
```

**Temperature:** 0.3
**Max Tokens:** 2000

### 🎮 AGENT 2: Match Analysis Expert

**System Prompt:**
```
Вы - специалист по глубокому анализу матчей Dota 2.

КОМПЕТЕНЦИИ:
- Детальный разбор конкретных матчей
- Анализ draft фаз и стратегий
- Оценка решений в игре
- Timing анализ (фарм, ганки, пуши)
- Анализ командных боев

ОБЯЗАТЕЛЬНЫЕ ДЕЙСТВИЯ:
1. Получить matchID из FlowState
2. Загрузить полные данные матча
3. Проанализировать timeline событий
4. Оценить ключевые моменты
5. Выявить причины победы/поражения

ФОРМАТ ОТВЕТА:
- Overview матча
- Draft analysis
- Key moments timeline
- Mistakes & good plays
- Lessons learned

ИСПОЛЬЗУЙТЕ FlowState: matchID, teamComposition, gameMode, winRate, sessionContext
```

**Temperature:** 0.4
**Max Tokens:** 2500

### 🧠 AGENT 3: Meta & Hero Strategist

**System Prompt:**
```
Вы - эксперт по текущей мете и героям Dota 2 (патч 7.37e).

КОМПЕТЕНЦИИ:
- Анализ актуальной меты
- Tier-листы героев по ролям
- Counter-pick стратегии
- Оптимальные билды и итемы
- Синергии в команде

ОБЯЗАТЕЛЬНЫЕ ДЕЙСТВИЯ:
1. Учитывать текущий патч (7.37e)
2. Анализировать популярность героев
3. Предоставлять counter-pick советы
4. Рекомендовать оптимальные билды
5. Объяснять место героя в мете

ФОРМАТ ОТВЕТА:
- Статус героя в текущей мете
- Рекомендуемые билды
- Counter-picks и синергии
- Роль в команде
- Timing пики

ИСПОЛЬЗУЙТЕ FlowState: heroName, currentMeta, patchVersion, rolePreference, itemBuild
```

**Temperature:** 0.2
**Max Tokens:** 2000

### 🏆 AGENT 4: Pro Scene Analyst

**System Prompt:**
```
Вы - аналитик профессиональной сцены Dota 2.

КОМПЕТЕНЦИИ:
- Анализ турнирных данных
- Стратегии про-команд
- Тренды в профессиональных матчах
- Анализ ban/pick приоритетов
- Мета-сдвиги на про-сцене

ОБЯЗАТЕЛЬНЫЕ ДЕЙСТВИЯ:
1. Анализировать последние турниры
2. Сравнивать с pub-метой
3. Выявлять тренды
4. Объяснять стратегические решения
5. Переносить знания на любительский уровень

ФОРМАТ ОТВЕТА:
- Актуальные про-тренды
- Различия с pub-метой
- Стратегические инсайты
- Применимость для обычных игроков
- Прогнозы развития меты

ИСПОЛЬЗУЙТЕ FlowState: tournamentData, currentMeta, skillLevel, patchVersion
```

**Temperature:** 0.3
**Max Tokens:** 2200

---

## 🎯 CONDITION AGENT LOGIC

### Routing Scenarios:

```json
{
  "conditions": [
    {
      "name": "Player Analytics Route",
      "condition": "analysisType === 'player_analytics' || playerID !== ''",
      "targetAgent": "agentAgentflow_1",
      "flowStateUpdates": {
        "primaryAgent": "player_analytics",
        "currentTask": "player_analysis"
      }
    },
    {
      "name": "Match Analysis Route", 
      "condition": "analysisType === 'match_analysis' || matchID !== ''",
      "targetAgent": "agentAgentflow_2",
      "flowStateUpdates": {
        "primaryAgent": "match_analysis",
        "currentTask": "match_breakdown"
      }
    },
    {
      "name": "Meta Strategy Route",
      "condition": "analysisType === 'meta_strategy' || heroName !== '' || keywords.includes('meta', 'hero', 'build')",
      "targetAgent": "agentAgentflow_3", 
      "flowStateUpdates": {
        "primaryAgent": "meta_strategy",
        "currentTask": "meta_analysis"
      }
    },
    {
      "name": "Pro Scene Route",
      "condition": "analysisType === 'pro_scene' || keywords.includes('tournament', 'pro', 'competitive')",
      "targetAgent": "agentAgentflow_5",
      "flowStateUpdates": {
        "primaryAgent": "pro_scene",
        "currentTask": "pro_analysis"
      }
    },
    {
      "name": "Default Route",
      "condition": "true",
      "targetAgent": "agentAgentflow_1",
      "flowStateUpdates": {
        "primaryAgent": "general",
        "currentTask": "general_analysis"
      }
    }
  ]
}
```

### Condition Agent System Prompt:
```
Вы - интеллектуальный маршрутизатор многоагентной системы Dota 2.

ЗАДАЧИ:
1. Анализировать userQuery и FlowState
2. Определять оптимального специалиста
3. Обновлять FlowState для целевого агента
4. Передавать управление с контекстом

ЛОГИКА МАРШРУТИЗАЦИИ:
- playerID/stats → Player Analytics (Agent 1)
- matchID/match data → Match Analysis (Agent 2)  
- heroName/meta/builds → Meta Strategy (Agent 3)
- tournament/pro → Pro Scene (Agent 4)

ВАЖНО: Всегда обновляйте primaryAgent и currentTask в FlowState
```

---

## 💾 FLOWSTATE MANAGEMENT

### Ключевые принципы:

1. **Инициализация**: Start Node заполняет базовые переменные
2. **Наследование**: Каждый агент читает и обновляет FlowState
3. **Контекст**: Сохраняйте sessionContext для цепочек анализа
4. **Валидация**: Проверяйте обязательные поля перед анализом

### Критические переменные по агентам:

| Агент | Обязательные FlowState |
|-------|------------------------|
| Player Analytics | playerID, playerMMR, rolePreference |
| Match Analysis | matchID, teamComposition, gameMode |
| Meta Strategy | heroName, currentMeta, patchVersion |
| Pro Scene | tournamentData, skillLevel |

---

## 🔍 VECTOR & KNOWLEDGE BASE

### Настройки Embeddings:

```json
{
  "vectorStore": {
    "provider": "pinecone",
    "dimensions": 1536,
    "metric": "cosine",
    "topK": 10
  },
  "knowledgeBase": {
    "dota2_heroes": "hero-data.json",
    "patch_notes": "patch-7.37e.md", 
    "pro_matches": "tournament-data.json",
    "meta_analysis": "meta-trends.json"
  }
}
```

### Типы документов для векторизации:
- Описания героев и способностей
- Патч-ноуты и изменения
- Гайды и стратегии
- Статистика про-матчей
- Мета-аналитика по рангам

---

## 🔗 ROUTING & CONNECTIONS

### Схема соединений:
```
User Input → Start Node → Condition Agent → Specialist Agent → Response
                ↓               ↓              ↓
           FlowState     Route Logic    Specialized Analysis
```

### Connection Settings:
- **Start → Condition**: Передача полного FlowState
- **Condition → Agents**: Контекстная маршрутизация 
- **Agents → User**: Финальный ответ + обновленный FlowState
- **Agent → Condition**: Для сложных цепочек анализа

---

## ⚡ BEST PRACTICES

### 🎯 Оптимизация производительности:
1. **Temperature Settings**:
   - Аналитика: 0.2-0.3 (точность)
   - Творчество: 0.5-0.7 (рекомендации)
   - Routing: 0.1 (консистентность)

2. **Token Management**:
   - Start Node: 500 tokens
   - Condition: 300 tokens  
   - Specialists: 2000-2500 tokens

3. **FlowState Optimization**:
   - Очищайте неиспользуемые переменные
   - Сжимайте большие данные
   - Используйте ссылки на внешние данные

### 🔐 Безопасность:
- Валидация входных данных
- Ограничение API calls
- Таймауты для длинных операций
- Логирование для отладки

### 📊 Мониторинг:
- Отслеживание маршрутизации
- Метрики производительности
- Качество ответов
- Использование FlowState

---

## 🛠️ ПРИМЕР ПОЛНОЙ КОНФИГУРАЦИИ

### Start Node JSON:
```json
{
  "id": "agentAgentflow_0",
  "type": "start",
  "systemPrompt": "Вы - начальный узел многоагентной системы анализа Dota 2...",
  "temperature": 0.2,
  "maxTokens": 500,
  "flowState": [
    {"key": "currentTask", "value": ""},
    {"key": "primaryAgent", "value": ""},
    // ... остальные 23 переменные
  ]
}
```

### Specialist Agent JSON:
```json
{
  "id": "agentAgentflow_1", 
  "type": "agent",
  "role": "Player Analytics Specialist",
  "systemPrompt": "Вы - эксперт по анализу игроков Dota 2...",
  "temperature": 0.3,
  "maxTokens": 2000,
  "tools": ["openDotaMCP", "stratzMCP"],
  "knowledgeBase": ["hero-data", "rank-system"]
}
```

---

## 📞 ПОДДЕРЖКА И ОТЛАДКА

### Общие проблемы:
1. **FlowState не передается**: Проверьте connections
2. **Неправильная маршрутизация**: Валидируйте condition logic
3. **Пустые ответы**: Проверьте API connections
4. **Медленная работа**: Оптимизируйте token limits

### Логи для проверки:
- FlowState transitions
- Agent activations  
- API call results
- Error messages

---

**ВАЖНО**: Каждый агент должен быть специализированным экспертом в своей области, использовать актуальные данные (патч 7.37e), и поддерживать FlowState для обеспечения связности анализа.
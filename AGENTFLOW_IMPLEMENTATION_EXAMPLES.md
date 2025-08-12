# 🎮 ПРИМЕРЫ РЕАЛИЗАЦИИ AGENTFLOW ДЛЯ DOTA 2

## 📋 ГОТОВЫЕ КОНФИГУРАЦИИ АГЕНТОВ

### 🚀 START NODE - ПОЛНАЯ КОНФИГУРАЦИЯ

```json
{
  "id": "agentAgentflow_0",
  "position": {"x": 100, "y": 100},
  "type": "start",
  "data": {
    "label": "Start Node - Dota 2 Analytics Hub",
    "systemPrompt": "Вы - начальный узел многоагентной системы анализа Dota 2. Ваша задача - инициализировать FlowState, проанализировать запрос пользователя и подготовить данные для маршрутизации.\n\nОБЯЗАТЕЛЬНЫЕ ДЕЙСТВИЯ:\n1. Заполните все релевантные FlowState переменные из запроса\n2. Определите тип анализа: player_analytics, match_analysis, meta_strategy, pro_scene\n3. Извлеките ID игрока, матча, название героя если есть\n4. Установите актуальную версию патча (7.37e)\n5. Сохраните оригинальный запрос в userQuery\n\nПередайте управление Condition Agent для интеллектуальной маршрутизации.",
    "temperature": 0.2,
    "maxTokens": 500,
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
}
```

---

### 📊 AGENT 1: PLAYER ANALYTICS SPECIALIST

```json
{
  "id": "agentAgentflow_1",
  "position": {"x": 300, "y": 200},
  "type": "agent",
  "data": {
    "label": "Player Analytics Specialist",
    "systemPrompt": "Вы - ведущий эксперт по анализу игроков Dota 2. Специализируетесь на персональной статистике, прогрессе игроков и индивидуальных рекомендациях.\n\nВАШИ КОМПЕТЕНЦИИ:\n- Глубокий анализ статистики игрока (винрейт, GPM, XPM, KDA, рейтинг)\n- Оценка прогресса по рангам и изменений MMR\n- Анализ предпочитаемых героев и ролей\n- Выявление паттернов игры и слабых мест\n- Персонализированные рекомендации по улучшению\n\nАЛГОРИТМ РАБОТЫ:\n1. Получите playerID из FlowState\n2. Запросите данные через OpenDota/Stratz MCP\n3. Проанализируйте последние 20-50 матчей\n4. Выявите тренды и паттерны\n5. Обновите FlowState с находками\n6. Предоставьте структурированный отчет\n\nФОРМАТ ОТВЕТА:\n- Краткое резюме профиля игрока\n- Детальная статистика по героям и ролям\n- Выявленные сильные и слабые стороны\n- Конкретные рекомендации по улучшению\n- Сравнение с игроками аналогичного ранга\n\nИСПОЛЬЗУЙТЕ FlowState: playerID, playerMMR, rolePreference, identifiedWeaknesses, recommendations",
    "temperature": 0.3,
    "maxTokens": 2000,
    "tools": ["openDotaMCP", "stratzMCP"],
    "memoryType": "buffer",
    "knowledgeBase": ["dota2-heroes", "rank-system", "meta-trends"]
  }
}
```

---

### 🎯 AGENT 2: MATCH ANALYSIS EXPERT

```json
{
  "id": "agentAgentflow_2", 
  "position": {"x": 500, "y": 200},
  "type": "agent",
  "data": {
    "label": "Match Analysis Expert",
    "systemPrompt": "Вы - специалист по детальному анализу матчей Dota 2. Фокусируетесь на разборе игровых решений, стратегий и ключевых моментов.\n\nВАШИ КОМПЕТЕНЦИИ:\n- Глубокий анализ конкретных матчей и их динамики\n- Разбор draft фаз и стратегических решений\n- Оценка игровых решений команд и отдельных игроков\n- Timing анализ (фарм паттерны, ганки, пуши, Roshan)\n- Детальный анализ командных боев и их исходов\n\nМЕТОДОЛОГИЯ АНАЛИЗА:\n1. Получите matchID из FlowState\n2. Загрузите полные данные матча через MCP\n3. Проанализируйте timeline ключевых событий\n4. Оцените критические моменты и turning points\n5. Выявите причины победы/поражения\n6. Предоставьте обучающие инсайты\n\nФОРМАТ ОТЧЕТА:\n- Overview матча (команды, длительность, результат)\n- Draft analysis (ban/pick логика, композиции)\n- Key moments timeline с временными метками\n- Анализ критических ошибок и хороших решений\n- Извлеченные уроки и рекомендации\n\nИСПОЛЬЗУЙТЕ FlowState: matchID, teamComposition, gameMode, winRate, sessionContext",
    "temperature": 0.4,
    "maxTokens": 2500,
    "tools": ["openDotaMCP", "stratzMCP", "dotaBuffMCP"],
    "memoryType": "buffer",
    "knowledgeBase": ["match-patterns", "draft-strategies", "timing-guides"]
  }
}
```

---

### 🧠 AGENT 3: META & HERO STRATEGIST

```json
{
  "id": "agentAgentflow_3",
  "position": {"x": 700, "y": 200}, 
  "type": "agent",
  "data": {
    "label": "Meta & Hero Strategist",
    "systemPrompt": "Вы - ведущий эксперт по текущей мете Dota 2 (патч 7.37e) и стратегическому использованию героев.\n\nВАША ЭКСПЕРТИЗА:\n- Глубокое понимание актуальной меты и tier-листов\n- Анализ изменений патча и их влияния на героев\n- Оптимальные билды и последовательности предметов\n- Counter-pick стратегии и синергии команд\n- Адаптация стратегий под разные ранги\n\nМЕТОДЫ АНАЛИЗА:\n1. Анализируйте текущий патч 7.37e и его особенности\n2. Оценивайте популярность и эффективность героев\n3. Рассматривайте статистику по рангам и регионам\n4. Учитывайте про-сцену и популярные стратегии\n5. Адаптируйте рекомендации под уровень игрока\n\nФОРМАТ КОНСУЛЬТАЦИИ:\n- Статус героя в текущей мете (tier, популярность)\n- Рекомендуемые билды с объяснением выбора\n- Counter-picks и синергетичные пики\n- Роль героя в командной композиции\n- Timing пики и стратегическое использование\n- Альтернативные варианты для разных ситуаций\n\nИСПОЛЬЗУЙТЕ FlowState: heroName, currentMeta, patchVersion, rolePreference, itemBuild",
    "temperature": 0.2,
    "maxTokens": 2000,
    "tools": ["stratzMCP", "dotaBuffMCP"],
    "memoryType": "buffer", 
    "knowledgeBase": ["meta-analysis", "hero-guides", "patch-notes", "item-builds"]
  }
}
```

---

### 🏆 AGENT 4: PRO SCENE ANALYST

```json
{
  "id": "agentAgentflow_5",
  "position": {"x": 900, "y": 200},
  "type": "agent", 
  "data": {
    "label": "Pro Scene Analyst",
    "systemPrompt": "Вы - аналитик профессиональной сцены Dota 2 с глубоким пониманием турнирных трендов и стратегий топ-команд.\n\nВАШИ СПЕЦИАЛИЗАЦИИ:\n- Анализ последних турниров и их результатов\n- Стратегии и тактики профессиональных команд\n- Тренды в ban/pick приоритетах про-игроков\n- Различия между про-метой и публичными играми\n- Прогнозирование развития меты\n\nАНАЛИТИЧЕСКИЙ ПОДХОД:\n1. Отслеживайте последние турниры и их статистику\n2. Анализируйте стратегические тренды топ-команд\n3. Сравнивайте про-мету с публичными играми\n4. Выявляйте инновационные подходы и стратегии\n5. Адаптируйте про-знания для обычных игроков\n\nФОРМАТ АНАЛИТИКИ:\n- Обзор актуальных трендов в про-сцене\n- Ключевые различия с pub-метой\n- Стратегические инсайты от топ-команд\n- Применимость про-стратегий для любителей\n- Прогнозы развития меты и будущих изменений\n- Рекомендации по внедрению про-подходов\n\nИСПОЛЬЗУЙТЕ FlowState: tournamentData, currentMeta, skillLevel, patchVersion",
    "temperature": 0.3,
    "maxTokens": 2200,
    "tools": ["stratzMCP", "liquidpediaMCP"],
    "memoryType": "buffer",
    "knowledgeBase": ["tournament-data", "pro-strategies", "team-analysis"]
  }
}
```

---

### 🎯 CONDITION AGENT - INTELLIGENT ROUTER

```json
{
  "id": "conditionAgent",
  "position": {"x": 200, "y": 300},
  "type": "condition",
  "data": {
    "label": "Intelligent Routing Hub",
    "systemPrompt": "Вы - интеллектуальный маршрутизатор многоагентной системы анализа Dota 2. Ваша задача - анализировать запрос и FlowState для выбора оптимального специалиста.\n\nЛОГИКА МАРШРУТИЗАЦИИ:\n\n1. PLAYER ANALYTICS (Agent 1):\n   - Если есть playerID или запрос о статистике игрока\n   - Ключевые слова: 'статистика', 'профиль', 'прогресс', 'ранг', 'MMR'\n   - analysisType === 'player_analytics'\n\n2. MATCH ANALYSIS (Agent 2):\n   - Если есть matchID или запрос о конкретном матче\n   - Ключевые слова: 'матч', 'игра', 'разбор', 'анализ игры'\n   - analysisType === 'match_analysis'\n\n3. META STRATEGY (Agent 3):\n   - Если есть heroName или запросы о мете/билдах\n   - Ключевые слова: 'мета', 'герой', 'билд', 'предметы', 'counter'\n   - analysisType === 'meta_strategy'\n\n4. PRO SCENE (Agent 4):\n   - Запросы о турнирах и про-сцене\n   - Ключевые слова: 'турнир', 'про', 'команда', 'профессионал'\n   - analysisType === 'pro_scene'\n\nВсегда обновляйте primaryAgent и currentTask в FlowState перед передачей.",
    "temperature": 0.1,
    "maxTokens": 300,
    "conditions": [
      {
        "name": "Player Analytics Route",
        "expression": "analysisType === 'player_analytics' || playerID !== '' || userQuery.includes('статистика') || userQuery.includes('профиль')",
        "targetAgent": "agentAgentflow_1"
      },
      {
        "name": "Match Analysis Route", 
        "expression": "analysisType === 'match_analysis' || matchID !== '' || userQuery.includes('матч') || userQuery.includes('разбор')",
        "targetAgent": "agentAgentflow_2"
      },
      {
        "name": "Meta Strategy Route",
        "expression": "analysisType === 'meta_strategy' || heroName !== '' || userQuery.includes('мета') || userQuery.includes('билд')",
        "targetAgent": "agentAgentflow_3"
      },
      {
        "name": "Pro Scene Route",
        "expression": "analysisType === 'pro_scene' || userQuery.includes('турнир') || userQuery.includes('про')",
        "targetAgent": "agentAgentflow_5"
      }
    ],
    "defaultAgent": "agentAgentflow_1"
  }
}
```

---

## 🔗 CONNECTIONS CONFIGURATION

```json
{
  "connections": [
    {
      "source": "agentAgentflow_0",
      "target": "conditionAgent",
      "type": "flowState",
      "data": {"transferAll": true}
    },
    {
      "source": "conditionAgent", 
      "target": "agentAgentflow_1",
      "type": "conditional",
      "condition": "player_analytics"
    },
    {
      "source": "conditionAgent",
      "target": "agentAgentflow_2", 
      "type": "conditional",
      "condition": "match_analysis"
    },
    {
      "source": "conditionAgent",
      "target": "agentAgentflow_3",
      "type": "conditional", 
      "condition": "meta_strategy"
    },
    {
      "source": "conditionAgent",
      "target": "agentAgentflow_5",
      "type": "conditional",
      "condition": "pro_scene"
    }
  ]
}
```

---

## 📊 KNOWLEDGE BASE SETUP

### Vector Store Configuration:
```json
{
  "vectorStores": {
    "dota2Heroes": {
      "type": "pinecone",
      "index": "dota2-heroes-v2",
      "dimensions": 1536,
      "metric": "cosine",
      "topK": 5
    },
    "metaAnalysis": {
      "type": "chroma", 
      "collection": "meta-trends-737e",
      "dimensions": 384,
      "topK": 10
    }
  },
  "knowledgeBases": [
    {
      "name": "dota2-heroes",
      "documents": ["heroes.json", "abilities.json", "talents.json"],
      "vectorStore": "dota2Heroes"
    },
    {
      "name": "meta-analysis",
      "documents": ["patch-737e.md", "tier-lists.json", "winrates.csv"],
      "vectorStore": "metaAnalysis"
    }
  ]
}
```

---

## 🚀 DEPLOYMENT CHECKLIST

### ✅ Перед запуском проверьте:

1. **Agent Configuration**:
   - [ ] Все system prompts заполнены
   - [ ] Temperature settings оптимизированы
   - [ ] Max tokens установлены правильно
   - [ ] Tools подключены (MCP)

2. **FlowState Setup**:
   - [ ] Все 25 переменных в Start Node
   - [ ] Правильные ключи и типы данных
   - [ ] Валидация обязательных полей

3. **Routing Logic**:
   - [ ] Condition expressions работают
   - [ ] Default routing настроен
   - [ ] FlowState updates правильные

4. **Knowledge Base**:
   - [ ] Vector stores подключены
   - [ ] Documents загружены и индексированы
   - [ ] Embeddings сгенерированы

5. **API Connections**:
   - [ ] OpenDota MCP настроен
   - [ ] Stratz MCP подключен
   - [ ] API ключи валидны

---

## 🔧 TROUBLESHOOTING

### Частые проблемы и решения:

| Проблема | Причина | Решение |
|----------|---------|---------|
| Agent не активируется | Неправильный condition | Проверьте expression syntax |
| FlowState не передается | Неправильные connections | Валидируйте connection config |
| Пустые ответы | Отсутствие API данных | Проверьте MCP connections |
| Медленная работа | Большие token limits | Оптимизируйте maxTokens |
| Неточная маршрутизация | Слабые conditions | Улучшите condition logic |

---

**ВАЖНО**: Тестируйте каждого агента отдельно перед интеграцией в полную систему. Используйте логирование для отладки FlowState transitions.
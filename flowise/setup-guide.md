# 🎮 Полная инструкция настройки Dota 2 AI Agent в Flowise

## 🚀 **Шаг 1: Подготовка MCP Server**

### 1.1 Запуск OpenDota MCP Server
```bash
# Убедись что сервер запущен
docker compose up -d

# Проверь доступность
curl http://localhost:3001/health
```

### 1.2 Тестирование MCP соединения
```bash
# Через MCP Inspector
npx mcp-inspector http://localhost:3001/mcp
```

## 🔧 **Шаг 2: Установка Flowise**

### 2.1 Установка через Docker (рекомендуется)
```bash
# Создай папку для Flowise
mkdir flowise-dota2 && cd flowise-dota2

# Создай docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.1'
services:
  flowise:
    image: flowiseai/flowise:latest
    restart: always
    environment:
      - PORT=3000
      - FLOWISE_USERNAME=admin
      - FLOWISE_PASSWORD=your_secure_password
      - DATABASE_PATH=/root/.flowise
      - APIKEY_PATH=/root/.flowise
      - SECRETKEY_PATH=/root/.flowise
      - LOG_LEVEL=debug
    ports:
      - '3000:3000'
    volumes:
      - ~/.flowise:/root/.flowise
    command: /bin/sh -c "sleep 3; flowise start"
EOF

# Запуск
docker compose up -d
```

### 2.2 Доступ к Flowise
- Открой http://localhost:3000
- Войди с credentials: admin / your_secure_password

## 🏗️ **Шаг 3: Настройка MCP в Flowise**

### 3.1 Добавление MCP Server
1. Перейди в **Settings** → **Tools & Integrations**
2. Нажми **"Add MCP Server"**
3. Заполни конфигурацию:

```json
{
  "name": "opendota-mcp",
  "serverUrl": "http://host.docker.internal:3001/mcp",
  "description": "OpenDota/Stratz GraphQL API integration",
  "timeout": 30000,
  "retries": 3
}
```

### 3.2 Проверка подключения
1. В разделе **MCP Tools** должны появиться:
   - `search-schema`
   - `introspect-type`
   - `query-graphql`
   - `debug-schema-status`
   - `get-query-examples`

## 🤖 **Шаг 4: Создание Dota 2 Agent**

### 4.1 Создание основного агента
1. Нажми **"+ New AgentFlow"**
2. Выбери **"AgentFlow V2"**
3. Настрой **Master Agent**:

**Name:** `Dota2ProAnalytics`
**Description:** `Professional Dota 2 analytics and coaching assistant`

**System Prompt:**
```
# Dota 2 Pro Analytics Assistant

Ты - профессиональный аналитик и тренер по Dota 2 с 10+ летним опытом. Твоя цель - помочь игрокам улучшить свои навыки через анализ данных, стратегические советы и мета-аналитику.

## Твои ключевые компетенции:
- 📊 **Анализ игроков**: детальная статистика, сильные/слабые стороны, рекомендации по развитию
- 🎯 **Анализ матчей**: разбор драфта, экономики, решений, поворотных моментов
- 🛡️ **Мета-анализ**: актуальные сборки, герои, стратегии по патчам
- 🏆 **Турнирная аналитика**: разбор профессиональных матчей, тенденции команд
- 🎪 **Драфт-коучинг**: советы по пикам/банам, синергии, контр-пики

## Обязательный workflow для всех запросов:
1. **ВСЕГДА начинай с поиска данных** через search-schema
2. **Используй конкретные query** для получения актуальной информации  
3. **Анализируй полученные данные** в контексте патча и мета
4. **Давай конкретные рекомендации** с обоснованием

## Формат ответов:
- 📈 **Данные**: что показывает статистика
- 🧠 **Анализ**: что это означает в игровом контексте
- 🎯 **Рекомендации**: конкретные действия для улучшения
- 🔥 **Мета-контекст**: как это связано с текущим патчем

Никогда не давай общие советы без данных. Всегда опирайся на актуальную статистику!
```

### 4.2 Добавление MCP Tools
1. В разделе **Tools** добавь все MCP tools:
   - ✅ `search-schema`
   - ✅ `introspect-type`
   - ✅ `query-graphql`
   - ✅ `debug-schema-status`
   - ✅ `get-query-examples`

### 4.3 Настройка модели
- **Model:** Claude 3.5 Sonnet (рекомендуется)
- **Temperature:** 0.3
- **Max Tokens:** 4000

## 🎯 **Шаг 5: Создание специализированных агентов**

### 5.1 Player Analysis Agent
**Name:** `PlayerAnalysisSpecialist`
**System Prompt:**
```
Ты - специалист по анализу игроков Dota 2. Твоя задача - глубокий анализ статистики игроков и рекомендации по улучшению.

## При анализе игрока ВСЕГДА:
1. Получи базовую статистику через search-schema(keywords: ["player", "steam", "winrate"])
2. Используй query-graphql для детальных данных игрока
3. Проанализируй performance по ролям и героям  
4. Сравни с игроками аналогичного ранга
5. Дай конкретные рекомендации по развитию

## Обязательные метрики:
- Overall winrate и recent performance
- Любимые герои и их эффективность
- Performance по позициям (1-5)
- Экономические показатели (GPM, XPM) 
- Combat metrics (KDA, damage, support stats)

Всегда используй актуальные данные из API!
```

### 5.2 Match Analysis Agent
**Name:** `MatchAnalysisExpert`
**System Prompt:**
```
Ты анализируешь матчи как профессиональный тренер команды. Фокусируйся на ключевых решениях и поворотных моментах.

## Framework для анализа матча:
1. Начни с search-schema(keywords: ["match", "duration", "players"])
2. Получи детальные данные матча через query-graphql
3. Проанализируй драфт обеих команд
4. Разбери игровые фазы и ключевые моменты
5. Дай конкретные уроки для улучшения

## Ключевые области анализа:
- 🎭 Качество драфта и стратегии
- ⏰ Performance в разные фазы игры
- ⚔️ Критические тим-файты и решения
- 📈 Экономическое развитие команд
- 🏆 Факторы победы/поражения

Используй точные данные из матча для всех выводов!
```

### 5.3 Meta Expert Agent
**Name:** `MetaAnalysisGuru`
**System Prompt:**
```
Ты - эксперт по мета-анализу героев и текущему состоянию игры.

## При анализе мета:
1. Используй search-schema(keywords: ["hero", "winrate", "meta", "popularity"])
2. Получи статистику героев через query-graphql
3. Сравни с данными предыдущих патчей
4. Проанализируй причины изменений
5. Дай прогнозы на будущее

## Включай в анализ:
- 📊 Винрейт по рангам (Herald → Immortal)
- 📈 Pick/ban rate в ranked и pro играх
- 🛡️ Позиционная эффективность
- 🔄 Синергии и контр-пики
- 🛠️ Популярные builds и стратегии

Всегда обосновывай выводы статистикой!
```

## 🔄 **Шаг 6: Настройка Agent Workflows**

### 6.1 Player Analysis Workflow
1. Создай новый **Sequential Agent**
2. Добавь последовательность:
   - **Agent 1:** Master Coordinator (парсинг запроса)
   - **Agent 2:** Player Analysis Specialist (анализ данных)
   - **Agent 3:** Master Coordinator (итоговые рекомендации)

### 6.2 Match Analysis Workflow  
1. Создай **Multi-Agent** flow
2. Настрой параллельную обработку:
   - **Match Analyst:** основной анализ матча
   - **Meta Expert:** анализ драфта в контексте мета
   - **Master Coordinator:** синтез результатов

### 6.3 Hero Meta Workflow
1. **Agent 1:** Meta Analysis Guru (статистика героя)
2. **Agent 2:** Match Analysis Expert (роль в матчах)
3. **Agent 3:** Master Coordinator (итоговые выводы)

## 📊 **Шаг 7: Добавление дополнительных инструментов**

### 7.1 Web Search для актуальных новостей
1. Добавь **SerpAPI** tool для поиска новостей о патчах
2. Настрой поиск по запросам "Dota 2 patch", "meta changes"

### 7.2 Memory для контекста сессий
1. Включи **Conversation Memory**
2. Настрой хранение предыдущих анализов игрока

### 7.3 Calculator для расчетов
1. Добавь **Calculator** tool для математических расчетов
2. Используй для вычисления winrates, статистики

## 🎮 **Шаг 8: Тестирование агента**

### 8.1 Тестовые сценарии
```
1. "Проанализируй игрока со Steam ID 123456789"
2. "Разбери матч 7891234567" 
3. "Как сейчас играется Pudge в мете?"
4. "Посоветуй драфт против Invoker + Magnus"
```

### 8.2 Проверка workflow
- ✅ Агент использует MCP tools
- ✅ Получает актуальные данные
- ✅ Дает конкретные рекомендации
- ✅ Форматирует ответы структурированно

## 🚀 **Шаг 9: Оптимизация и деплой**

### 9.1 Performance настройки
- **Timeout:** 60 секунд для сложных запросов
- **Parallel execution:** для независимых задач
- **Error handling:** graceful degradation при API ошибках

### 9.2 Production deployment
```bash
# Production docker-compose
version: '3.8'
services:
  flowise:
    image: flowiseai/flowise:latest
    restart: unless-stopped
    environment:
      - PORT=3000
      - DATABASE_PATH=/opt/flowise/database
      - APIKEY_PATH=/opt/flowise/apikeys
      - LOG_LEVEL=info
    ports:
      - "3000:3000"
    volumes:
      - flowise_data:/opt/flowise
    depends_on:
      - opendota-mcp

  opendota-mcp:
    image: your-registry/opendota-mcp:latest
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - ENDPOINT=https://api.stratz.com/graphql
      - HEADERS={"Authorization":"Bearer YOUR_TOKEN"}

volumes:
  flowise_data:
```

## 🎯 **Готовые промпты для пользователей**

### Анализ игрока
```
"Проанализируй мою игру: Steam ID 123456789. Покажи мои слабые места и что улучшить."
```

### Анализ матча
```
"Разбери матч 7891234567. Почему мы проиграли и что можно было сделать по-другому?"
```

### Мета-анализ
```
"Как сейчас стоит Phantom Assassin в мете? Стоит ли её пикать в 7.37?"
```

### Драфт-советы
```
"У нас уже есть Invoker mid и Crystal Maiden support. Что пикать на carry?"
```

---

## 🏆 **Результат: Профессиональный Dota 2 AI тренер**

Этот агент будет превосходить конкурентов благодаря:
- ✅ **Актуальным данным** из OpenDota/Stratz API
- ✅ **Глубокой аналитике** на основе реальной статистики  
- ✅ **Специализированным агентам** для разных задач
- ✅ **Структурированным ответам** с конкретными рекомендациями
- ✅ **Мета-осведомленности** и знанием патчей

**Теперь у тебя есть самый продвинутый Dota 2 AI помощник на рынке! 🚀**
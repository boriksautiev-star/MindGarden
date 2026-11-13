import type { Settings, AgentResponse, AgentMode, GraphAnalysisResponse, AIProfile, ChatMessage, GraphInitialResponse, BuildMode, ThoughtNode, EdgeType } from './types';

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function extractJSON(text: string) {
  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) clean = clean.substring(start, end + 1);
  return JSON.parse(clean);
}

const PROFILE_PROMPTS: Record<AIProfile, string> = {
  psychology: `Ты — поддерживающий психолог. Будь эмпатичным, ищи чувства и ограничивающие убеждения.`,
  business: `Ты — бизнес-стратег. Будь прямым и аналитичным. Ищи риски, упущенную выгоду, слепые зоны.`,
  academic: `Ты — строгий научный руководитель. Требуй фактов, доказательств, логики.`,
  finance: `Ты — финансовый советник. Считай цифры, оценивай риски, оптимизируй бюджет.`,
  work: `Ты — карьерный коуч. Фокус на эффективность, выгорание, отношения с руководством.`
};

const getSystemPrompt = (mode: AgentMode, profile: AIProfile) => {
  const base = `Ты — партнёр по мышлению в приложении "Мысленный сад".
Твой профиль: ${PROFILE_PROMPTS[profile]}
Ответ строго в формате JSON:
{
  "questions": ["вопрос 1"],
  "proposed_nodes": [{"type": "thought", "label": "текст", "relation": "related"}],
  "flags": []
}
Типы узлов: thought, question, fact, assumption, criterion, option.
Типы связей (relation): "supports", "contradicts", "related".`;

  switch (mode) {
    case 'clarify': return base + `\nРЕЖИМ: Уточнение. Задай 1-2 вопроса. Предложи 1-2 узла.`;
    case 'assumptions': return base + `\nРЕЖИМ: Поиск допущений. Найди ограничивающие убеждения. Сформулируй их бережно. Предложи узлы типа "assumption".`;
    case 'critique': return base + `\nРЕЖИМ: Поиск ресурсов. Найди то, что дает силы. Предложи узлы типа "fact" или "criterion" со связью "supports".`;
    case 'options': return base + `\nРЕЖИМ: Варианты действий. Предложи 2-3 МАЛЕНЬКИХ шага. Тип "option".`;
    default: return base;
  }
};

export async function askAgent(
  history: ChatMessage[], 
  settings: Settings | null, 
  mode: AgentMode = 'clarify', 
  profile: AIProfile = 'psychology'
): Promise<AgentResponse | { error: string }> {
  if (!settings || !settings.apiKey) return { error: 'Ключ не настроен.' };

  const { provider, apiKey } = settings;
  const sysPrompt = getSystemPrompt(mode, profile);
  const lastUserMsg = history[history.length - 1].content;

  if (/(суицид|убить себя|не хочу жить|покончить с собой)/i.test(lastUserMsg)) {
    return { error: 'Похоже, тебе сейчас очень тяжело. Пожалуйста, позвони на бесплатную линию психологической помощи: 8-800-2000-122.' };
  }

  try {
    if (provider === 'gigachat') {
      const tokenRes = await fetch('/gigachat-auth/api/v2/oauth', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'RqUID': generateUUID(), 'Authorization': `Basic ${apiKey}` },
        body: 'scope=GIGACHAT_API_PERS'
      });
      if (!tokenRes.ok) throw new Error(`Auth: ${tokenRes.status}`);
      const token = (await tokenRes.json()).access_token;
      
      const messages = [
        { role: 'system', content: sysPrompt + '\n\nВАЖНО: Верни ответ ТОЛЬКО в виде валидного JSON.' },
        ...history.map(m => ({ role: m.role, content: m.content }))
      ];

      const res = await fetch('/gigachat-api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ model: 'GigaChat-2', messages })
      });
      if (res.status === 429) throw new Error('Слишком много запросов к GigaChat. Пожалуйста, подождите 1-2 минуты.');
      if (!res.ok) throw new Error(`GigaChat API: ${res.status}`);
      return extractJSON((await res.json()).choices[0].message.content);
    }
    return { error: 'Пока поддерживается только GigaChat' };
  } catch (err: any) {
    return { error: `Ошибка: ${err.message}` };
  }
}

export async function generateInitialTree(text: string, settings: Settings | null, profile: AIProfile, buildMode: BuildMode): Promise<GraphInitialResponse | { error: string }> {
  if (!settings || !settings.apiKey) return { error: 'Ключ не настроен.' };

  let treeSizePrompt = "Создай 4-7 узлов.";
  if (buildMode === 'auto') {
    treeSizePrompt = `Создай дерево РОВНО ИЗ 10 УЗЛОВ (не больше и не меньше). 
Структура должна быть такой:
- 1 корневой узел (главная мысль).
- 3 главные ветки (дочерние узлы от корня).
- К каждой из 3 главных веток добавь РОВНО по 2 подузла.
Итого: 1 + 3 + 6 = 10 узлов. 
Раскрой тему структурно и осмысленно, но строго в рамках 10 узлов.`;
  }

  const sysPrompt = `Ты — мудрый садовник мыслей. Профиль: ${PROFILE_PROMPTS[profile]}.
Пользователь вывалил хаос из своих мыслей. Твоя задача — структурировать это в дерево.
${treeSizePrompt}
Один из узлов должен быть главной мыслью (корнем).
Обязательно свяжи их (от корня к остальным).

Ответ строго в формате JSON:
{
  "nodes": [{"id": "n1", "label": "текст", "type": "thought|question|fact|assumption|criterion|option"}],
  "edges": [{"source": "n1", "target": "n2", "relation": "supports|contradicts|related"}]
}`;

  const { provider, apiKey } = settings;
  try {
    if (provider === 'gigachat') {
      const tokenRes = await fetch('/gigachat-auth/api/v2/oauth', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'RqUID': generateUUID(), 'Authorization': `Basic ${apiKey}` },
        body: 'scope=GIGACHAT_API_PERS'
      });
      if (!tokenRes.ok) throw new Error(`Auth: ${tokenRes.status}`);
      const token = (await tokenRes.json()).access_token;
      
      const res = await fetch('/gigachat-api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ model: 'GigaChat-2', messages: [{ role: 'system', content: sysPrompt + '\n\nВАЖНО: Верни ответ ТОЛЬКО в виде валидного JSON.' }, { role: 'user', content: text }] })
      });
      if (res.status === 429) throw new Error('Слишком много запросов к GigaChat. Пожалуйста, подождите 1-2 минуты.');
      if (!res.ok) throw new Error(`GigaChat API: ${res.status}`);
      return extractJSON((await res.json()).choices[0].message.content);
    }
    return { error: 'Пока поддерживается только GigaChat' };
  } catch (err: any) {
    return { error: `Ошибка: ${err.message}` };
  }
}

export async function analyzeGraph(nodes: any[], edges: any[], settings: Settings | null, profile: AIProfile): Promise<GraphAnalysisResponse | { error: string }> {
  if (!settings || !settings.apiKey) return { error: 'Ключ не настроен.' };
  if (nodes.length === 0) return { error: 'Граф пуст.' };

  const nodesText = nodes.map(n => `[ID: ${n.id}] [Тип: ${n.type}] ${n.label}`).join('\n');
  const edgesText = edges.map(e => `[От: ${e.source}] -> [К: ${e.target}] (${e.type})`).join('\n');
  
  const sysPrompt = `Ты — мудрый садовник мыслей. Профиль: ${PROFILE_PROMPTS[profile]}.
Найди "белые пятна" и предложи 3-4 НОВЫХ узла. 

УЗЛЫ:
${nodesText}

СВЯЗИ:
${edgesText}

Ответ строго в формате JSON:
{
  "suggestions": [
    { "label": "текст", "type": "thought|question|fact|assumption|criterion|option", "connectToId": "ID", "relation": "supports|contradicts|related" }
  ]
}`;

  const { provider, apiKey } = settings;
  try {
    if (provider === 'gigachat') {
      const tokenRes = await fetch('/gigachat-auth/api/v2/oauth', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'RqUID': generateUUID(), 'Authorization': `Basic ${apiKey}` },
        body: 'scope=GIGACHAT_API_PERS'
      });
      if (!tokenRes.ok) throw new Error(`Auth: ${tokenRes.status}`);
      const token = (await tokenRes.json()).access_token;
      
      const res = await fetch('/gigachat-api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ model: 'GigaChat-2', messages: [{ role: 'system', content: sysPrompt + '\n\nВАЖНО: Верни ответ ТОЛЬКО в виде валидного JSON.' }, { role: 'user', content: 'Проанализируй.' }] })
      });
      if (res.status === 429) throw new Error('Слишком много запросов к GigaChat. Пожалуйста, подождите 1-2 минуты.');
      if (!res.ok) throw new Error(`GigaChat API: ${res.status}`);
      return extractJSON((await res.json()).choices[0].message.content);
    }
    return { error: 'Пока поддерживается только GigaChat' };
  } catch (err: any) {
    return { error: `Ошибка анализа: ${err.message}` };
  }
}

export async function getNodeInsight(
  nodeLabel: string, 
  parents: string[], 
  children: string[], 
  settings: Settings | null, 
  profile: AIProfile
): Promise<string> {
  if (!settings || !settings.apiKey) return 'Ключ не настроен.';

  const { provider, apiKey } = settings;
  const sysPrompt = `Ты — мудрый наставник. Профиль: ${PROFILE_PROMPTS[profile]}.
Пользователь смотрит на узел в своей карте мыслей. Твоя задача — объяснить смысл этого узла в контексте.
Узел: "${nodeLabel}"
Родительские мысли (откуда это пришло): ${parents.length ? parents.join('; ') : 'нет (это корень)'}
Дочерние мысли (к чему это ведет): ${children.length ? children.join('; ') : 'пока нет'}

Напиши ОДИН короткий абзац (2-3 предложения). Объясни, почему эта мысль важна и как она связана с остальными. Без воды.`;

  try {
    if (provider === 'gigachat') {
      const tokenRes = await fetch('/gigachat-auth/api/v2/oauth', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'RqUID': generateUUID(), 'Authorization': `Basic ${apiKey}` },
        body: 'scope=GIGACHAT_API_PERS'
      });
      if (!tokenRes.ok) throw new Error(`Auth: ${tokenRes.status}`);
      const token = (await tokenRes.json()).access_token;
      
      const res = await fetch('/gigachat-api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ model: 'GigaChat-2', messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: 'Объясни.' }] })
      });
      if (res.status === 429) throw new Error('Слишком много запросов к GigaChat. Пожалуйста, подождите 1-2 минуты.');
      if (!res.ok) throw new Error(`GigaChat API: ${res.status}`);
      return (await res.json()).choices[0].message.content;
    }
    return 'Пока поддерживается только GigaChat.';
  } catch (err: any) {
    return `Ошибка: ${err.message}`;
  }
}

export async function expandNode(
  parentLabel: string, 
  settings: Settings | null, 
  profile: AIProfile, 
  buildMode: BuildMode
): Promise<GraphInitialResponse | { error: string }> {
  if (!settings || !settings.apiKey) return { error: 'Ключ не настроен.' };

  const nodeCount = buildMode === 'auto' ? '3-4 узла' : '1-2 узла';
  const sysPrompt = `Ты — мудрый садовник мыслей. Профиль: ${PROFILE_PROMPTS[profile]}.
Пользователь хочет углубить ветку. Родительский узел: "${parentLabel}".
Придумай, что логично добавить к этой мысли. Создай ${nodeCount}.
Ответ строго в формате JSON:
{
  "nodes": [{"id": "n1", "label": "текст", "type": "thought|question|fact|assumption|criterion|option"}],
  "edges": [{"source": "parent", "target": "n1", "relation": "supports|contradicts|related"}]
}`;

  const { provider, apiKey } = settings;
  try {
    if (provider === 'gigachat') {
      const tokenRes = await fetch('/gigachat-auth/api/v2/oauth', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'RqUID': generateUUID(), 'Authorization': `Basic ${apiKey}` },
        body: 'scope=GIGACHAT_API_PERS'
      });
      if (!tokenRes.ok) throw new Error(`Auth: ${tokenRes.status}`);
      const token = (await tokenRes.json()).access_token;
      
      const res = await fetch('/gigachat-api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ model: 'GigaChat-2', messages: [{ role: 'system', content: sysPrompt + '\n\nВАЖНО: Верни ответ ТОЛЬКО в виде валидного JSON.' }, { role: 'user', content: 'Сгенерируй.' }] })
      });
      if (res.status === 429) throw new Error('Слишком много запросов к GigaChat. Пожалуйста, подождите 1-2 минуты.');
      if (!res.ok) throw new Error(`GigaChat API: ${res.status}`);
      return extractJSON((await res.json()).choices[0].message.content);
    }
    return { error: 'Пока поддерживается только GigaChat' };
  } catch (err: any) {
    return { error: `Ошибка: ${err.message}` };
  }
}

export async function generateActionPlan(
  nodes: ThoughtNode[],
  settings: Settings | null,
  profile: AIProfile
): Promise<string | { error: string }> {
  if (!settings || !settings.apiKey) return { error: 'Ключ не настроен.' };
  if (nodes.length === 0) return { error: 'Нет решенных мыслей или вариантов для плана.' };

  const { provider, apiKey } = settings;
  const context = nodes.map(n => `- [${n.type}] ${n.label}`).join('\n');
  
  const sysPrompt = `Ты — мудрый садовник мыслей и эксперт по планированию. Профиль: ${PROFILE_PROMPTS[profile]}.
Пользователь собрал "урожай" из своего сада мыслей. Вот его решенные идеи и выбранные варианты:
${context}

Твоя задача — составить из этого четкий, практический пошаговый план действий (To-Do List). 
Выдели самые важные шаги. Пиши кратко, по делу, с эмодзи для наглядности. Не используй сложные термины.`;

  try {
    if (provider === 'gigachat') {
      const tokenRes = await fetch('/gigachat-auth/api/v2/oauth', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'RqUID': generateUUID(), 'Authorization': `Basic ${apiKey}` },
        body: 'scope=GIGACHAT_API_PERS'
      });
      if (!tokenRes.ok) throw new Error(`Auth: ${tokenRes.status}`);
      const token = (await tokenRes.json()).access_token;
      
      const res = await fetch('/gigachat-api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ model: 'GigaChat-2', messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: 'Составь план действий.' }] })
      });
      if (res.status === 429) throw new Error('Слишком много запросов к GigaChat. Пожалуйста, подождите 1-2 минуты.');
      if (!res.ok) throw new Error(`GigaChat API: ${res.status}`);
      return (await res.json()).choices[0].message.content;
    }
    return { error: 'Пока поддерживается только GigaChat' };
  } catch (err: any) {
    return { error: `${err.message}` };
  }
}

export async function findMissingLinks(
  nodes: ThoughtNode[],
  edges: any[],
  settings: Settings | null
): Promise<{ links: { source: string; target: string; relation: EdgeType }[] } | { error: string }> {
  if (!settings || !settings.apiKey) return { error: 'Ключ не настроен.' };
  if (nodes.length < 2) return { error: 'Слишком мало узлов для поиска связей.' };

  const { provider, apiKey } = settings;
  const nodesText = nodes.map(n => `[ID: ${n.id}] ${n.label}`).join('\n');
  const edgesText = edges.map(e => `${e.source} -> ${e.target}`).join('\n');

  const sysPrompt = `Ты — аналитик данных. Перед тобой граф мыслей.
Твоя задача — найти логические связи между узлами, которые ЕЩЕ НЕ СОЕДИНЕНЫ.
Например, один факт опровергает другой (contradicts), или один вариант поддерживает критерий (supports), или просто они тесно связаны по смыслу (related).

УЗЛЫ:
${nodesText}

ТЕКУЩИЕ СВЯЗИ (не предлагай их повторно):
${edgesText}

Предложи до 5 новых связей. Ответ строго в формате JSON:
{
  "links": [
    { "source": "id_откуда", "target": "id_куда", "relation": "supports|contradicts|related" }
  ]
}`;

  try {
    if (provider === 'gigachat') {
      const tokenRes = await fetch('/gigachat-auth/api/v2/oauth', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'RqUID': generateUUID(), 'Authorization': `Basic ${apiKey}` },
        body: 'scope=GIGACHAT_API_PERS'
      });
      if (!tokenRes.ok) throw new Error(`Auth: ${tokenRes.status}`);
      const token = (await tokenRes.json()).access_token;
      
      const res = await fetch('/gigachat-api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ model: 'GigaChat-2', messages: [{ role: 'system', content: sysPrompt + '\n\nВАЖНО: Верни ответ ТОЛЬКО в виде валидного JSON.' }, { role: 'user', content: 'Найди связи.' }] })
      });
      if (res.status === 429) throw new Error('Слишком много запросов к GigaChat. Пожалуйста, подождите 1-2 минуты.');
      if (!res.ok) throw new Error(`GigaChat API: ${res.status}`);
      return extractJSON((await res.json()).choices[0].message.content);
    }
    return { error: 'Пока поддерживается только GigaChat' };
  } catch (err: any) {
    return { error: `Ошибка: ${err.message}` };
  }
}
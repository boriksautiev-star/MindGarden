import type { Settings, AgentResponse, AgentMode, GraphAnalysisResponse, AIProfile, ChatMessage, GraphInitialResponse, BuildMode } from './types';

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
  psychology: `РўС‹ вЂ” РїРѕРґРґРµСЂР¶РёРІР°СЋС‰РёР№ РїСЃРёС…РѕР»РѕРі. Р‘СѓРґСЊ СЌРјРїР°С‚РёС‡РЅС‹Рј, РёС‰Рё С‡СѓРІСЃС‚РІР° Рё РѕРіСЂР°РЅРёС‡РёРІР°СЋС‰РёРµ СѓР±РµР¶РґРµРЅРёСЏ.`,
  business: `РўС‹ вЂ” Р±РёР·РЅРµСЃ-СЃС‚СЂР°С‚РµРі. Р‘СѓРґСЊ РїСЂСЏРјС‹Рј Рё Р°РЅР°Р»РёС‚РёС‡РЅС‹Рј. РС‰Рё СЂРёСЃРєРё, СѓРїСѓС‰РµРЅРЅСѓСЋ РІС‹РіРѕРґСѓ, СЃР»РµРїС‹Рµ Р·РѕРЅС‹.`,
  academic: `РўС‹ вЂ” СЃС‚СЂРѕРіРёР№ РЅР°СѓС‡РЅС‹Р№ СЂСѓРєРѕРІРѕРґРёС‚РµР»СЊ. РўСЂРµР±СѓР№ С„Р°РєС‚РѕРІ, РґРѕРєР°Р·Р°С‚РµР»СЊСЃС‚РІ, Р»РѕРіРёРєРё.`,
  finance: `РўС‹ вЂ” С„РёРЅР°РЅСЃРѕРІС‹Р№ СЃРѕРІРµС‚РЅРёРє. РЎС‡РёС‚Р°Р№ С†РёС„СЂС‹, РѕС†РµРЅРёРІР°Р№ СЂРёСЃРєРё, РѕРїС‚РёРјРёР·РёСЂСѓР№ Р±СЋРґР¶РµС‚.`,
  work: `РўС‹ вЂ” РєР°СЂСЊРµСЂРЅС‹Р№ РєРѕСѓС‡. Р¤РѕРєСѓСЃ РЅР° СЌС„С„РµРєС‚РёРІРЅРѕСЃС‚СЊ, РІС‹РіРѕСЂР°РЅРёРµ, РѕС‚РЅРѕС€РµРЅРёСЏ СЃ СЂСѓРєРѕРІРѕРґСЃС‚РІРѕРј.`
};

const getSystemPrompt = (mode: AgentMode, profile: AIProfile) => {
  const base = `РўС‹ вЂ” РїР°СЂС‚РЅС‘СЂ РїРѕ РјС‹С€Р»РµРЅРёСЋ РІ РїСЂРёР»РѕР¶РµРЅРёРё "РњС‹СЃР»РµРЅРЅС‹Р№ СЃР°Рґ".
РўРІРѕР№ РїСЂРѕС„РёР»СЊ: ${PROFILE_PROMPTS[profile]}
РћС‚РІРµС‚ СЃС‚СЂРѕРіРѕ РІ С„РѕСЂРјР°С‚Рµ JSON:
{
  "questions": ["РІРѕРїСЂРѕСЃ 1"],
  "proposed_nodes": [{"type": "thought", "label": "С‚РµРєСЃС‚", "relation": "related"}],
  "flags": []
}
РўРёРїС‹ СѓР·Р»РѕРІ: thought, question, fact, assumption, criterion, option.
РўРёРїС‹ СЃРІСЏР·РµР№ (relation): "supports", "contradicts", "related".`;

  switch (mode) {
    case 'clarify': return base + `\nР Р•Р–РРњ: РЈС‚РѕС‡РЅРµРЅРёРµ. Р—Р°РґР°Р№ 1-2 РІРѕРїСЂРѕСЃР°. РџСЂРµРґР»РѕР¶Рё 1-2 СѓР·Р»Р°.`;
    case 'assumptions': return base + `\nР Р•Р–РРњ: РџРѕРёСЃРє РґРѕРїСѓС‰РµРЅРёР№. РќР°Р№РґРё РѕРіСЂР°РЅРёС‡РёРІР°СЋС‰РёРµ СѓР±РµР¶РґРµРЅРёСЏ. РЎС„РѕСЂРјСѓР»РёСЂСѓР№ РёС… Р±РµСЂРµР¶РЅРѕ. РџСЂРµРґР»РѕР¶Рё СѓР·Р»С‹ С‚РёРїР° "assumption".`;
    case 'critique': return base + `\nР Р•Р–РРњ: РџРѕРёСЃРє СЂРµСЃСѓСЂСЃРѕРІ. РќР°Р№РґРё С‚Рѕ, С‡С‚Рѕ РґР°РµС‚ СЃРёР»С‹. РџСЂРµРґР»РѕР¶Рё СѓР·Р»С‹ С‚РёРїР° "fact" РёР»Рё "criterion" СЃРѕ СЃРІСЏР·СЊСЋ "supports".`;
    case 'options': return base + `\nР Р•Р–РРњ: Р’Р°СЂРёР°РЅС‚С‹ РґРµР№СЃС‚РІРёР№. РџСЂРµРґР»РѕР¶Рё 2-3 РњРђР›Р•РќР¬РљРРҐ С€Р°РіР°. РўРёРї "option".`;
    default: return base;
  }
};

export async function askAgent(
  history: ChatMessage[], 
  settings: Settings | null, 
  mode: AgentMode = 'clarify', 
  profile: AIProfile = 'psychology'
): Promise<AgentResponse | { error: string }> {
  if (!settings || !settings.apiKey) return { error: 'РљР»СЋС‡ РЅРµ РЅР°СЃС‚СЂРѕРµРЅ.' };

  const { provider, apiKey } = settings;
  const sysPrompt = getSystemPrompt(mode, profile);
  const lastUserMsg = history[history.length - 1].content;

  if (/(СЃСѓРёС†РёРґ|СѓР±РёС‚СЊ СЃРµР±СЏ|РЅРµ С…РѕС‡Сѓ Р¶РёС‚СЊ|РїРѕРєРѕРЅС‡РёС‚СЊ СЃ СЃРѕР±РѕР№)/i.test(lastUserMsg)) {
    return { error: 'РџРѕС…РѕР¶Рµ, С‚РµР±Рµ СЃРµР№С‡Р°СЃ РѕС‡РµРЅСЊ С‚СЏР¶РµР»Рѕ. РџРѕР¶Р°Р»СѓР№СЃС‚Р°, РїРѕР·РІРѕРЅРё РЅР° Р±РµСЃРїР»Р°С‚РЅСѓСЋ Р»РёРЅРёСЋ РїСЃРёС…РѕР»РѕРіРёС‡РµСЃРєРѕР№ РїРѕРјРѕС‰Рё: 8-800-2000-122.' };
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
        { role: 'system', content: sysPrompt + '\n\nР’РђР–РќРћ: Р’РµСЂРЅРё РѕС‚РІРµС‚ РўРћР›Р¬РљРћ РІ РІРёРґРµ РІР°Р»РёРґРЅРѕРіРѕ JSON.' },
        ...history.map(m => ({ role: m.role, content: m.content }))
      ];

      const res = await fetch('/gigachat-api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ model: 'GigaChat-2', messages })
      });
      if (!res.ok) throw new Error(`GigaChat API: ${res.status}`);
      return extractJSON((await res.json()).choices[0].message.content);
    }
    return { error: 'РџРѕРєР° РїРѕРґРґРµСЂР¶РёРІР°РµС‚СЃСЏ С‚РѕР»СЊРєРѕ GigaChat' };
  } catch (err: any) {
    return { error: `РћС€РёР±РєР°: ${err.message}` };
  }
}

export async function generateInitialTree(text: string, settings: Settings | null, profile: AIProfile, buildMode: BuildMode): Promise<GraphInitialResponse | { error: string }> {
  if (!settings || !settings.apiKey) return { error: 'РљР»СЋС‡ РЅРµ РЅР°СЃС‚СЂРѕРµРЅ.' };

  let treeSizePrompt = "РЎРѕР·РґР°Р№ 4-7 СѓР·Р»РѕРІ.";
  if (buildMode === 'auto') {
    // Р–Р•РЎРўРљРћР• РћР“Р РђРќРР§Р•РќРР•: Р РѕРІРЅРѕ 10 СѓР·Р»РѕРІ
    treeSizePrompt = `РЎРѕР·РґР°Р№ РґРµСЂРµРІРѕ Р РћР’РќРћ РР— 10 РЈР—Р›РћР’ (РЅРµ Р±РѕР»СЊС€Рµ Рё РЅРµ РјРµРЅСЊС€Рµ). 
РЎС‚СЂСѓРєС‚СѓСЂР° РґРѕР»Р¶РЅР° Р±С‹С‚СЊ С‚Р°РєРѕР№:
- 1 РєРѕСЂРЅРµРІРѕР№ СѓР·РµР» (РіР»Р°РІРЅР°СЏ РјС‹СЃР»СЊ).
- 3 РіР»Р°РІРЅС‹Рµ РІРµС‚РєРё (РґРѕС‡РµСЂРЅРёРµ СѓР·Р»С‹ РѕС‚ РєРѕСЂРЅСЏ).
- Рљ РєР°Р¶РґРѕР№ РёР· 3 РіР»Р°РІРЅС‹С… РІРµС‚РѕРє РґРѕР±Р°РІСЊ Р РћР’РќРћ РїРѕ 2 РїРѕРґСѓР·Р»Р°.
РС‚РѕРіРѕ: 1 + 3 + 6 = 10 СѓР·Р»РѕРІ. 
Р Р°СЃРєСЂРѕР№ С‚РµРјСѓ СЃС‚СЂСѓРєС‚СѓСЂРЅРѕ Рё РѕСЃРјС‹СЃР»РµРЅРЅРѕ, РЅРѕ СЃС‚СЂРѕРіРѕ РІ СЂР°РјРєР°С… 10 СѓР·Р»РѕРІ.`;
  }

  const sysPrompt = `РўС‹ вЂ” РјСѓРґСЂС‹Р№ СЃР°РґРѕРІРЅРёРє РјС‹СЃР»РµР№. РџСЂРѕС„РёР»СЊ: ${PROFILE_PROMPTS[profile]}.
РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РІС‹РІР°Р»РёР» С…Р°РѕСЃ РёР· СЃРІРѕРёС… РјС‹СЃР»РµР№. РўРІРѕСЏ Р·Р°РґР°С‡Р° вЂ” СЃС‚СЂСѓРєС‚СѓСЂРёСЂРѕРІР°С‚СЊ СЌС‚Рѕ РІ РґРµСЂРµРІРѕ.
${treeSizePrompt}
РћРґРёРЅ РёР· СѓР·Р»РѕРІ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РіР»Р°РІРЅРѕР№ РјС‹СЃР»СЊСЋ (РєРѕСЂРЅРµРј).
РћР±СЏР·Р°С‚РµР»СЊРЅРѕ СЃРІСЏР¶Рё РёС… (РѕС‚ РєРѕСЂРЅСЏ Рє РѕСЃС‚Р°Р»СЊРЅС‹Рј).

РћС‚РІРµС‚ СЃС‚СЂРѕРіРѕ РІ С„РѕСЂРјР°С‚Рµ JSON:
{
  "nodes": [{"id": "n1", "label": "С‚РµРєСЃС‚", "type": "thought|question|fact|assumption|criterion|option"}],
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
        body: JSON.stringify({ model: 'GigaChat-2', messages: [{ role: 'system', content: sysPrompt + '\n\nР’РђР–РќРћ: Р’РµСЂРЅРё РѕС‚РІРµС‚ РўРћР›Р¬РљРћ РІ РІРёРґРµ РІР°Р»РёРґРЅРѕРіРѕ JSON.' }, { role: 'user', content: text }] })
      });
      if (!res.ok) throw new Error(`GigaChat API: ${res.status}`);
      return extractJSON((await res.json()).choices[0].message.content);
    }
    return { error: 'РџРѕРєР° РїРѕРґРґРµСЂР¶РёРІР°РµС‚СЃСЏ С‚РѕР»СЊРєРѕ GigaChat' };
  } catch (err: any) {
    return { error: `РћС€РёР±РєР°: ${err.message}` };
  }
}

export async function analyzeGraph(nodes: any[], edges: any[], settings: Settings | null, profile: AIProfile): Promise<GraphAnalysisResponse | { error: string }> {
  if (!settings || !settings.apiKey) return { error: 'РљР»СЋС‡ РЅРµ РЅР°СЃС‚СЂРѕРµРЅ.' };
  if (nodes.length === 0) return { error: 'Р“СЂР°С„ РїСѓСЃС‚.' };

  const nodesText = nodes.map(n => `[ID: ${n.id}] [РўРёРї: ${n.type}] ${n.label}`).join('\n');
  const edgesText = edges.map(e => `[РћС‚: ${e.source}] -> [Рљ: ${e.target}]`).join('\n');
  
  const sysPrompt = `РўС‹ вЂ” РјСѓРґСЂС‹Р№ СЃР°РґРѕРІРЅРёРє РјС‹СЃР»РµР№. РџСЂРѕС„РёР»СЊ: ${PROFILE_PROMPTS[profile]}.
РќР°Р№РґРё "Р±РµР»С‹Рµ РїСЏС‚РЅР°" Рё РїСЂРµРґР»РѕР¶Рё 3-4 РќРћР’Р«РҐ СѓР·Р»Р°. 

РЈР—Р›Р«:
${nodesText}

РЎР’РЇР—Р:
${edgesText}

РћС‚РІРµС‚ СЃС‚СЂРѕРіРѕ РІ С„РѕСЂРјР°С‚Рµ JSON:
{
  "suggestions": [
    { "label": "С‚РµРєСЃС‚", "type": "thought|question|fact|assumption|criterion|option", "connectToId": "ID", "relation": "supports|contradicts|related" }
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
        body: JSON.stringify({ model: 'GigaChat-2', messages: [{ role: 'system', content: sysPrompt + '\n\nР’РђР–РќРћ: Р’РµСЂРЅРё РѕС‚РІРµС‚ РўРћР›Р¬РљРћ РІ РІРёРґРµ РІР°Р»РёРґРЅРѕРіРѕ JSON.' }, { role: 'user', content: 'РџСЂРѕР°РЅР°Р»РёР·РёСЂСѓР№.' }] })
      });
      if (!res.ok) throw new Error(`GigaChat API: ${res.status}`);
      return extractJSON((await res.json()).choices[0].message.content);
    }
    return { error: 'РџРѕРєР° РїРѕРґРґРµСЂР¶РёРІР°РµС‚СЃСЏ С‚РѕР»СЊРєРѕ GigaChat' };
  } catch (err: any) {
    return { error: `РћС€РёР±РєР° Р°РЅР°Р»РёР·Р°: ${err.message}` };
  }
}

export async function getNodeInsight(
  nodeLabel: string, 
  parents: string[], 
  children: string[], 
  settings: Settings | null, 
  profile: AIProfile
): Promise<string> {
  if (!settings || !settings.apiKey) return 'РљР»СЋС‡ РЅРµ РЅР°СЃС‚СЂРѕРµРЅ.';

  const { provider, apiKey } = settings;
  const sysPrompt = `РўС‹ вЂ” РјСѓРґСЂС‹Р№ РЅР°СЃС‚Р°РІРЅРёРє. РџСЂРѕС„РёР»СЊ: ${PROFILE_PROMPTS[profile]}.
РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ СЃРјРѕС‚СЂРёС‚ РЅР° СѓР·РµР» РІ СЃРІРѕРµР№ РєР°СЂС‚Рµ РјС‹СЃР»РµР№. РўРІРѕСЏ Р·Р°РґР°С‡Р° вЂ” РѕР±СЉСЏСЃРЅРёС‚СЊ СЃРјС‹СЃР» СЌС‚РѕРіРѕ СѓР·Р»Р° РІ РєРѕРЅС‚РµРєСЃС‚Рµ.
РЈР·РµР»: "${nodeLabel}"
Р РѕРґРёС‚РµР»СЊСЃРєРёРµ РјС‹СЃР»Рё (РѕС‚РєСѓРґР° СЌС‚Рѕ РїСЂРёС€Р»Рѕ): ${parents.length ? parents.join('; ') : 'РЅРµС‚ (СЌС‚Рѕ РєРѕСЂРµРЅСЊ)'}
Р”РѕС‡РµСЂРЅРёРµ РјС‹СЃР»Рё (Рє С‡РµРјСѓ СЌС‚Рѕ РІРµРґРµС‚): ${children.length ? children.join('; ') : 'РїРѕРєР° РЅРµС‚'}

РќР°РїРёС€Рё РћР”РРќ РєРѕСЂРѕС‚РєРёР№ Р°Р±Р·Р°С† (2-3 РїСЂРµРґР»РѕР¶РµРЅРёСЏ). РћР±СЉСЏСЃРЅРё, РїРѕС‡РµРјСѓ СЌС‚Р° РјС‹СЃР»СЊ РІР°Р¶РЅР° Рё РєР°Рє РѕРЅР° СЃРІСЏР·Р°РЅР° СЃ РѕСЃС‚Р°Р»СЊРЅС‹РјРё. Р‘РµР· РІРѕРґС‹.`;

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
        body: JSON.stringify({ model: 'GigaChat-2', messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: 'РћР±СЉСЏСЃРЅРё.' }] })
      });
      if (!res.ok) throw new Error(`GigaChat API: ${res.status}`);
      return (await res.json()).choices[0].message.content;
    }
    return 'РџРѕРєР° РїРѕРґРґРµСЂР¶РёРІР°РµС‚СЃСЏ С‚РѕР»СЊРєРѕ GigaChat.';
  } catch (err: any) {
    return `РћС€РёР±РєР°: ${err.message}`;
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
      if (!res.ok) throw new Error(`GigaChat API: ${res.status}`);
      return extractJSON((await res.json()).choices[0].message.content);
    }
    return { error: 'Пока поддерживается только GigaChat' };
  } catch (err: any) {
    return { error: `Ошибка: ${err.message}` };
  }
}
import { useState, useRef, useEffect } from 'react';
import { askAgent } from '../ai';
import { useStore } from '../store';
import type { AgentResponse, AgentMode, EdgeType, AIProfile, ChatMessage } from '../types';

export function AgentPanel({ initialText, sourceNodeId, profile, onClose }: { initialText: string; sourceNodeId?: string; profile: AIProfile; onClose: () => void }) {
  const { settings, addNode, addEdge, nodes, edges } = useStore();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AgentMode>('clarify');
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([{ role: 'user', content: initialText }]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [history, response]);

  const handleSend = async (overrideHistory?: ChatMessage[]) => {
    const currentHistory = overrideHistory || history;
    if (!currentHistory.length || currentHistory[currentHistory.length-1].role === 'assistant' && !overrideHistory) return;

    setLoading(true); setError(null); setResponse(null);
    
    const res = await askAgent(currentHistory, settings, mode, profile);
    setLoading(false);
    
    if ('error' in res) setError(res.error);
    else {
      setResponse(res);
      if (res.questions?.length > 0) {
        setHistory([...currentHistory, { role: 'assistant', content: res.questions[0] }]);
      }
    }
  };

  const submitText = () => {
    if (!input.trim()) return;
    const newHistory: ChatMessage[] = [...history, { role: 'user', content: input }];
    setHistory(newHistory);
    setInput('');
    handleSend(newHistory);
  };

  const handleAddNode = async (type: any, label: string, relation: EdgeType = 'related') => {
    let pos = { x: Math.random() * 200, y: Math.random() * 200 };
    
    if (sourceNodeId) {
      const parent = nodes.find(n => n.id === sourceNodeId);
      if (parent) {
        // Считаем, сколько уже есть "детей" у этого родителя
        const siblingsCount = edges.filter(e => e.source === sourceNodeId).length;
        
        // Раскладываем в сетку (2 колонки)
        const col = siblingsCount % 2;
        const row = Math.floor(siblingsCount / 2);
        
        pos = { 
          x: parent.x + 50 + (col * 220), // Сдвиг вправо на 220px для второй колонки
          y: parent.y + 150 + (row * 130) // Сдвиг вниз на 130px для каждого нового ряда
        };
      }
    }
    
    const newNode = await addNode(label, type, pos);
    if (sourceNodeId) await addEdge(sourceNodeId, newNode.id, relation);
  };

  const modeLabels: Record<AgentMode, string> = { clarify: 'Уточнение', assumptions: 'Допущения', critique: 'Ресурсы', options: 'Варианты' };

  return (
    <div className="side-panel" style={{ display: 'flex', flexDirection: 'column', height: '80dvh', padding: 0 }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 8px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>Чат ({profile})</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 20 }}>✕</button>
      </div>

      {/* Mode Selector */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #eee' }}>
        <select value={mode} onChange={(e) => { setMode(e.target.value as AgentMode); setResponse(null); setError(null); }} style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}>
          {Object.entries(modeLabels).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
      </div>

      {/* Chat History & AI Response */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {history.map((msg, i) => (
          <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
            <div style={{ padding: '10px 14px', borderRadius: 16, background: msg.role === 'user' ? '#111' : '#f0f0f0', color: msg.role === 'user' ? '#fff' : '#111', fontSize: 14 }}>
              {msg.content}
            </div>
          </div>
        ))}
        
        {loading && <div style={{ fontSize: 13, color: '#888', alignSelf: 'flex-start' }}>Агент печатает...</div>}
        {error && <div style={{ padding: 10, background: '#fee', color: '#c00', borderRadius: 8, fontSize: 13 }}>{error}</div>}

        {response && response.proposed_nodes?.length > 0 && (
          <div style={{ marginTop: 8, borderTop: '1px dashed #ccc', paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>Предложенные идеи:</div>
            {response.proposed_nodes.map((n, i) => {
              const rel = n.relation || 'related';
              const relColor = rel === 'contradicts' ? '#ef4444' : rel === 'supports' ? '#10b981' : '#9ca3af';
              return (
                <div key={i} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 13, marginBottom: 6 }}>{n.label}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: relColor }}>↳ {rel}</span>
                    <button onClick={() => handleAddNode(n.type, n.label, rel)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, border: '1px solid #ddd', background: '#f9f9f9', cursor: 'pointer' }}>+ В дерево</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{ padding: 12, borderTop: '1px solid #eee', background: '#fafaf9', display: 'flex', gap: 8 }}>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && submitText()}
          placeholder="Ответь агенту..." 
          style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid #ddd', fontSize: 14, outline: 'none' }}
        />
        <button onClick={submitText} disabled={!input.trim() || loading} style={{ padding: '0 16px', borderRadius: 20, border: 0, background: input.trim() ? '#111' : '#ccc', color: '#fff', cursor: input.trim() ? 'pointer' : 'default', fontWeight: 600 }}>
          ↑
        </button>
      </div>
    </div>
  );
}
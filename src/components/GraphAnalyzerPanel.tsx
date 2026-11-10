import { useState } from 'react';
import { analyzeGraph } from '../ai';
import { useStore } from '../store';
import type { GraphAnalysisResponse, AIProfile } from '../types';

export function GraphAnalyzerPanel({ profile, onClose }: { profile: AIProfile; onClose: () => void }) {
  const { nodes, edges, settings, addNode, addEdge } = useStore();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<GraphAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    const res = await analyzeGraph(nodes, edges, settings, profile);
    setLoading(false);
    if ('error' in res) setError(res.error);
    else setResponse(res);
  };

  const handleAddSuggestion = async (suggestion: any) => {
    let parent = nodes.find(n => n.id === suggestion.connectToId);
    if (!parent && nodes.length > 0) parent = nodes[0]; 
    
    const pos = parent ? { x: parent.x + (Math.random() * 100 - 50), y: parent.y + 180 } : { x: 0, y: 0 };
    
    const newNode = await addNode(suggestion.label, suggestion.type, pos);
    
    if (parent) {
      await addEdge(parent.id, newNode.id, suggestion.relation);
    }
  };

  return (
    <div className="side-panel" style={{ background: '#f8fafc', borderLeft: '4px solid #10b981' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, color: '#10b981', fontWeight: 700 }}>✨ Умный анализ сада ({profile})</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 20 }}>✕</button>
      </div>

      {!response && !loading && !error && (
        <div style={{ fontSize: 14, color: '#333', marginBottom: 12 }}>
          ИИ посмотрит на всю твою карту целиком и предложит новые ветви, о которых ты не подумал.
          <button onClick={handleAnalyze} style={{ marginTop: 16, width: '100%', padding: '12px', borderRadius: 8, border: 0, background: '#10b981', color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>
            Запустить анализ
          </button>
        </div>
      )}

      {loading && <div style={{ fontSize: 14, color: '#888', textAlign: 'center', padding: '20px 0' }}>Мудрый садовник изучает твой сад...</div>}
      {error && <div style={{ padding: 12, background: '#fee', color: '#c00', borderRadius: 10, fontSize: 14 }}>{error}</div>}

      {response && response.suggestions?.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Что можно добавить в карту:</div>
          {response.suggestions.map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, background: '#fff', border: '1px solid #e5e5e5', borderRadius: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{s.label}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#888' }}>Тип: {s.type}</span>
                <button onClick={() => handleAddSuggestion(s)} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, border: '1px solid #10b981', color: '#10b981', background: '#ecfdf5', cursor: 'pointer', fontWeight: 600 }}>
                  + Вырастить ветвь
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {response && response.suggestions?.length === 0 && (
        <div style={{ fontSize: 14, color: '#888' }}>ИИ считает, что твой сад уже отлично проработан!</div>
      )}
    </div>
  );
}
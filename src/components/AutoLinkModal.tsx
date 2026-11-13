import { useState, useEffect, useRef } from 'react';
import { findMissingLinks } from '../ai';
import { useStore } from '../store';
import type { EdgeType } from '../types';

export function AutoLinkModal({ onClose }: { onClose: () => void }) {
  const { nodes, edges, settings, addEdge } = useStore();
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<{ source: string; target: string; relation: EdgeType }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    if (nodes.length < 2) {
      setError('Слишком мало узлов для анализа связей.');
      setLoading(false);
      return;
    }

    findMissingLinks(nodes, edges, settings).then(res => {
      setLoading(false);
      if ('error' in res) {
        setError(res.error);
      } else {
        setLinks(res.links || []);
      }
    });
  }, [nodes, edges, settings]);

  const handleApply = async () => {
    for (const link of links) {
      await addEdge(link.source, link.target, link.relation);
    }
    setApplied(true);
    setTimeout(onClose, 1000);
  };

  return (
    <div className="side-panel" style={{ background: '#f0f9ff', borderLeft: '4px solid #0ea5e9', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: '#0369a1', fontWeight: 700 }}>🔗 Поиск связей</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 20 }}>✕</button>
      </div>

      {loading && <div style={{ fontSize: 14, color: '#0369a1', textAlign: 'center', padding: '20px 0' }}>ИИ ищет скрытые взаимосвязи...</div>}
      {error && <div style={{ padding: 12, background: '#fee', color: '#c00', borderRadius: 10, fontSize: 14 }}>{error}</div>}

      {!loading && !error && links.length === 0 && (
        <div style={{ fontSize: 14, color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
          ИИ не нашел новых логических связей. Твой граф уже хорошо связан!
        </div>
      )}

      {!loading && !error && links.length > 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>Найдено {links.length} новых связей:</div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {links.map((link, i) => {
              const sourceNode = nodes.find(n => n.id === link.source);
              const targetNode = nodes.find(n => n.id === link.target);
              const relColor = link.relation === 'contradicts' ? '#ef4444' : link.relation === 'supports' ? '#10b981' : '#9ca3af';
              return (
                <div key={i} style={{ background: '#fff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontWeight: 600 }}>{sourceNode?.label || link.source}</div>
                  <div style={{ color: relColor, fontSize: 10, fontWeight: 'bold' }}>⬇ {link.relation}</div>
                  <div style={{ fontWeight: 600 }}>{targetNode?.label || link.target}</div>
                </div>
              );
            })}
          </div>
          
          <button 
            onClick={handleApply} 
            disabled={applied}
            style={{ marginTop: 12, padding: '12px', borderRadius: 8, border: 0, background: applied ? '#10b981' : '#0ea5e9', color: '#fff', cursor: applied ? 'default' : 'pointer', fontSize: 15, fontWeight: 600, transition: 'background 0.2s' }}
          >
            {applied ? '✅ Применено!' : 'Связать узлы'}
          </button>
        </div>
      )}
    </div>
  );
}
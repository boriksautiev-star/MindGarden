import { useState, useEffect, useRef } from 'react';
import { generateDebate } from '../ai';
import { useStore } from '../store';
import type { AIProfile } from '../types';

export function DebateModal({ nodeLabel, profile, onClose }: { nodeLabel: string; profile: AIProfile; onClose: () => void }) {
  const { settings } = useStore();
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    generateDebate(nodeLabel, profile, settings).then(res => {
      setLoading(false);
      if (typeof res === 'object' && 'error' in res) {
        setError(res.error);
      } else {
        setText(res as string);
      }
    });
  }, [nodeLabel, profile, settings]);

  return (
    <div className="side-panel" style={{ background: '#fdf4ff', borderLeft: '4px solid #d946ef', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: '#86198f', fontWeight: 700 }}>⚔️ Дебаты ({profile})</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 20 }}>✕</button>
      </div>

      <div style={{ fontSize: 13, color: '#86198f', marginBottom: 12, fontStyle: 'italic' }}>
        Тема: "{nodeLabel}"
      </div>

      {loading && <div style={{ fontSize: 14, color: '#86198f', textAlign: 'center', padding: '20px 0' }}>ИИ готовит аргументы...</div>}
      
      {error && <div style={{ padding: 12, background: '#fee', color: '#c00', borderRadius: 10, fontSize: 14 }}>{error}</div>}

      {text && !error && (
        <div style={{ flex: 1, overflowY: 'auto', fontSize: 14, color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: '#fff', padding: 16, borderRadius: 10, border: '1px solid #f0abfc' }}>
          {text}
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { generateActionPlan } from '../ai';
import { useStore } from '../store';
import type { AIProfile } from '../types';

export function ActionPlanModal({ profile, onClose }: { profile: AIProfile; onClose: () => void }) {
  const { nodes, settings } = useStore();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const relevantNodes = nodes.filter(n => n.status === 'resolved' || n.type === 'option');
    
    if (relevantNodes.length === 0) {
      setError('В вашем саду пока нет решенных мыслей или вариантов. Отметьте нужные узлы как "Решено" или добавьте "Вариант", чтобы собрать урожай.');
      setLoading(false);
      return;
    }

    generateActionPlan(relevantNodes, settings, profile).then(res => {
      setLoading(false);
      if (typeof res === 'object' && 'error' in res) setError(res.error);
      else setPlan(res as string);
    });
  }, [nodes, settings, profile]);

  const handleCopy = () => {
    if (plan) {
      navigator.clipboard.writeText(plan);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="side-panel" style={{ background: '#fffbeb', borderLeft: '4px solid #f59e0b', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: '#b45309', fontWeight: 700 }}>🌾 Урожай идей ({profile})</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 20 }}>✕</button>
      </div>

      {loading && <div style={{ fontSize: 14, color: '#b45309', textAlign: 'center', padding: '20px 0' }}>Собираем и структурируем ваши мысли...</div>}
      {error && <div style={{ padding: 12, background: '#fee', color: '#c00', borderRadius: 10, fontSize: 14 }}>{error}</div>}

      {plan && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', fontSize: 14, color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: '#fff', padding: 16, borderRadius: 10, border: '1px solid #fde68a' }}>
            {plan}
          </div>
          <button 
            onClick={handleCopy} 
            style={{ marginTop: 12, padding: '12px', borderRadius: 8, border: 0, background: copied ? '#10b981' : '#f59e0b', color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 600, transition: 'background 0.2s' }}
          >
            {copied ? '✅ Скопировано!' : '📋 Скопировать план'}
          </button>
        </div>
      )}
    </div>
  );
}
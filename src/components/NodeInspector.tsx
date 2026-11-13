import { useState, useEffect } from 'react';
import { useStore } from '../store';
import type { NodeType, NodeStatus, AIProfile } from '../types';
import { getNodeInsight } from '../ai';

const typeLabels: Record<NodeType, string> = {
  thought: 'Мысль', question: 'Вопрос', fact: 'Факт',
  assumption: 'Допущение', criterion: 'Критерий', option: 'Вариант',
};

const statusLabels: Record<NodeStatus, string> = {
  open: 'В работе', checked: 'Проверено', resolved: 'Решено', deferred: 'Отложено',
};

export function NodeInspector({ nodeId, profile, onAskAgent, onDebate, onClose }: { nodeId: string; profile: AIProfile; onAskAgent: () => void; onDebate: () => void; onClose: () => void }) {
  const { nodes, edges, settings, updateNodeType, updateNodeStatus, updateNodeLabel, deleteNode } = useStore();
  const node = nodes.find(n => n.id === nodeId);
  const [editText, setEditText] = useState('');
  
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  useEffect(() => {
    if (node) { setEditText(node.label); setInsight(null); }
  }, [nodeId, node?.label]);

  if (!node) return null;

  const handleSaveText = () => {
    if (editText.trim() && editText !== node.label) updateNodeLabel(node.id, editText.trim());
  };

  const handleGetInsight = async () => {
    setIsLoadingInsight(true);
    setInsight(null);
    
    try {
      const parentEdges = edges.filter(e => e.target === node.id);
      const childEdges = edges.filter(e => e.source === node.id);
      
      const parentLabels = parentEdges.map(e => nodes.find(n => n.id === e.source)?.label || '').filter(Boolean);
      const childLabels = childEdges.map(e => nodes.find(n => n.id === e.target)?.label || '').filter(Boolean);

      const text = await getNodeInsight(node.label, parentLabels, childLabels, settings, profile);
      setInsight(text);
    } catch {
      setInsight('Ошибка: Не удалось получить рассуждение.');
    } finally {
      setIsLoadingInsight(false);
    }
  };

  const isError = insight && (insight.startsWith('Ошибка') || insight.includes('не настроен'));

  return (
    <div className="side-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: '#888' }}>Инспектор узла</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 20 }}>✕</button>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>Текст мысли</label>
        <textarea 
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSaveText}
          rows={2}
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical', fontSize: 15 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>Тип</label>
          <select value={node.type} onChange={(e) => updateNodeType(node.id, e.target.value as NodeType)} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}>
            {Object.entries(typeLabels).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>Статус</label>
          <select value={node.status} onChange={(e) => updateNodeStatus(node.id, e.target.value as NodeStatus)} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}>
            {Object.entries(statusLabels).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', marginTop: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: insight || isLoadingInsight ? 8 : 0 }}>
          <div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>✨ Рассуждение</div>
          {!insight && !isLoadingInsight && (
            <button onClick={handleGetInsight} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
              Объяснить узел
            </button>
          )}
        </div>
        {isLoadingInsight && <div style={{ fontSize: 13, color: '#888' }}>Анализирую связи...</div>}
        
        {insight && (
          <>
            <div style={{ fontSize: 13, color: isError ? '#c00' : '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {insight}
            </div>
            <button onClick={handleGetInsight} style={{ marginTop: 8, fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', width: '100%' }}>
              Обновить
            </button>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={onAskAgent} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 0, background: '#111', color: '#fff', cursor: 'pointer', fontSize: 15 }}>
          Чат
        </button>
        <button onClick={onDebate} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 0, background: '#d946ef', color: '#fff', cursor: 'pointer', fontSize: 15 }}>
          ⚔️ Дебаты
        </button>
      </div>

      <button onClick={() => { deleteNode(node.id); onClose(); }} style={{ padding: '10px', borderRadius: 8, border: '1px solid #fee', background: '#fff0f0', color: '#c00', cursor: 'pointer', fontSize: 15 }}>
        Удалить узел
      </button>
    </div>
  );
}
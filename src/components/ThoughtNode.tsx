import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeType, NodeStatus } from '../types';
import { useStore } from '../store';

const typeLabels: Record<NodeType, string> = {
  thought: 'Мысль', question: 'Вопрос', fact: 'Факт',
  assumption: 'Допущение', criterion: 'Критерий', option: 'Вариант',
};

const statusIcons: Record<NodeStatus, string> = {
  open: '', checked: '☑️ ', resolved: '✅ ', deferred: '⏸️ '
};

export function ThoughtNode({ data }: NodeProps) {
  const { toggleNodeCollapse } = useStore();
  const nodeType = (data.type as NodeType) || 'thought';
  const status = (data.status as NodeStatus) || 'open';
  const isRoot = data.isRoot as boolean;
  const hasChildren = data.hasChildren as boolean;
  const isCollapsed = data.isCollapsed as boolean;
  const nodeId = data.nodeId as string;
  const onAddChild = data.onAddChild as (id: string) => void;
  const isSelected = data.isSelected as boolean;

  const isResolved = status === 'resolved';
  const isDeferred = status === 'deferred';
  const label = typeLabels[nodeType];

  const rootBorderColor = isRoot ? '#eab308' : 'var(--node-thought-border)';

  return (
    <div className={`thought-node type-${nodeType} ${isRoot ? 'is-root' : ''} ${isSelected ? 'is-selected' : ''} ${isResolved ? 'is-resolved' : ''} ${isDeferred ? 'is-deferred' : ''}`}>
      
      <Handle type="target" position={Position.Top} style={{ background: rootBorderColor, opacity: isResolved ? 0.5 : 1, width: isRoot ? 10 : 8, height: isRoot ? 10 : 8 }} />

      <div style={{
        position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
        background: rootBorderColor, color: '#fff', fontSize: 10, fontWeight: 'bold',
        padding: isRoot ? '3px 12px' : '2px 10px', borderRadius: 12, textTransform: 'uppercase',
        letterSpacing: 0.5, whiteSpace: 'nowrap', opacity: 1, filter: 'none',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: isRoot ? '2px solid #fff' : 'none',
      }}>
        {isRoot ? '🌱 НАЧАЛО' : label}
      </div>

      <div style={{ marginTop: 4, lineHeight: 1.4, fontWeight: isRoot ? 600 : 400 }}>
        {statusIcons[status]} {data.label as string}
      </div>

      {hasChildren && (
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleNodeCollapse(nodeId); }}
          style={{
            position: 'absolute', bottom: 6, right: 6,
            background: 'var(--panel)', border: `2px solid ${rootBorderColor}`, color: rootBorderColor,
            borderRadius: '50%', width: 24, height: 24, fontSize: 16, fontWeight: 'bold',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)', padding: 0, zIndex: 100, pointerEvents: 'all', lineHeight: 1
          }}
          title={isCollapsed ? "Развернуть ветку" : "Свернуть ветку"}
        >
          {isCollapsed ? '+' : '−'}
        </button>
      )}

      {isSelected && (
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onAddChild(nodeId); }}
          style={{
            position: 'absolute', top: '50%', right: -55, transform: 'translateY(-50%)',
            background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 8,
            padding: '8px 12px', fontSize: 12, fontWeight: 'bold', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', whiteSpace: 'nowrap', zIndex: 1000,
            display: 'flex', alignItems: 'center', gap: 4
          }}
        >
          ✨ Углубить
        </button>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: rootBorderColor, opacity: isResolved ? 0.5 : 1, width: isRoot ? 10 : 8, height: isRoot ? 10 : 8 }} />
    </div>
  );
}
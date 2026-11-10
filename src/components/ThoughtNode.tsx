import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeType, NodeStatus } from '../types';
import { useStore } from '../store';

const typeStyles: Record<NodeType, { bg: string; border: string; color: string; label: string }> = {
  thought:    { bg: 'linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)', border: '#d1d5db', color: '#111827', label: 'Мысль' },
  question:   { bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '#60a5fa', color: '#1e3a8a', label: 'Вопрос' },
  fact:       { bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', border: '#34d399', color: '#064e3b', label: 'Факт' },
  assumption: { bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '#fbbf24', color: '#78350f', label: 'Допущение' },
  criterion:  { bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', border: '#a78bfa', color: '#4c1d95', label: 'Критерий' },
  option:     { bg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', border: '#fb923c', color: '#7c2d12', label: 'Вариант' },
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
  const isSelected = data.isSelected as boolean; // <-- Используем кастомный проп вместо selected от React Flow
  
  const style = typeStyles[nodeType];
  const isResolved = status === 'resolved';
  const isDeferred = status === 'deferred';

  const opacity = isResolved ? 0.6 : isDeferred ? 0.7 : 1;
  const filter = isResolved ? 'grayscale(80%)' : 'none';
  const borderStyle = isDeferred ? 'dashed' : 'solid';
  const textDecoration = isResolved ? 'line-through' : 'none';

  const rootBorderColor = isRoot ? '#eab308' : style.border;
  const rootBoxShadow = isRoot ? '0 0 15px rgba(234, 179, 8, 0.4), 0 4px 6px rgba(0,0,0,0.1)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
  const selectedBoxShadow = isSelected ? `0 0 0 3px ${rootBorderColor}, ${rootBoxShadow}` : rootBoxShadow;

  return (
    <div
      style={{
        background: style.bg,
        border: isRoot ? `3px ${borderStyle} #eab308` : `2px ${borderStyle} ${style.border}`,
        color: style.color,
        padding: '16px 20px',
        borderRadius: '24px 24px 24px 4px',
        minWidth: 160,
        maxWidth: 260,
        textAlign: 'center',
        boxShadow: selectedBoxShadow,
        fontSize: 14,
        position: 'relative',
        opacity,
        filter,
        transition: 'all 0.3s ease',
        textDecoration,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: rootBorderColor, opacity: isResolved ? 0.5 : 1, width: isRoot ? 10 : 8, height: isRoot ? 10 : 8 }} />
      
      <div style={{
        position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
        background: rootBorderColor, color: '#fff', fontSize: 10, fontWeight: 'bold',
        padding: isRoot ? '3px 12px' : '2px 10px', borderRadius: 12, textTransform: 'uppercase',
        letterSpacing: 0.5, whiteSpace: 'nowrap', opacity: 1, filter: 'none',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: isRoot ? '2px solid #fff' : 'none',
      }}>
        {isRoot ? '🌱 НАЧАЛО' : style.label}
      </div>

      <div style={{ marginTop: 4, lineHeight: 1.4, fontWeight: isRoot ? 600 : 400 }}>
        {statusIcons[status]} {data.label as string}
      </div>

      {/* Кнопка сворачивания веток */}
      {hasChildren && (
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleNodeCollapse(nodeId); }}
          style={{
            position: 'absolute', bottom: 6, right: 6,
            background: '#fff', border: `2px solid ${rootBorderColor}`, color: rootBorderColor,
            borderRadius: '50%', width: 24, height: 24, fontSize: 16, fontWeight: 'bold',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)', padding: 0, zIndex: 100, pointerEvents: 'all', lineHeight: 1
          }}
          title={isCollapsed ? "Развернуть ветку" : "Свернуть ветку"}
        >
          {isCollapsed ? '+' : '−'}
        </button>
      )}

      {/* Плавающая кнопка "Углубить" */}
      {isSelected && (
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onAddChild(nodeId); }}
          style={{
            position: 'absolute', top: '50%', right: -55, transform: 'translateY(-50%)',
            background: '#111', color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 12px', fontSize: 12, fontWeight: 'bold', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', whiteSpace: 'nowrap', zIndex: 1000,
            display: 'flex', alignItems: 'center', gap: 4
          }}
          title="Добавить дочерний узел"
        >
          ✨ Углубить
        </button>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: rootBorderColor, opacity: isResolved ? 0.5 : 1, width: isRoot ? 10 : 8, height: isRoot ? 10 : 8 }} />
    </div>
  );
}
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { useStore } from '../store';

export function ThoughtEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, selected,
}: EdgeProps) {
  const { deleteEdge } = useStore();
  
  // Используем getSmoothStepPath вместо getBezierPath для аккуратных "ступенек"
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
    borderRadius: 16,
  });

  return (
    <>
      <BaseEdge path={edgePath} style={style} interactionWidth={30} />
      
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 9999,
            }}
            className="nodrag nopan"
          >
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                deleteEdge(id);
              }}
              style={{
                width: 24, height: 24, borderRadius: '50%',
                background: '#fff', border: '1px solid #ddd', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: '#ef4444', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
              title="Удалить связь"
            >
              ✕
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
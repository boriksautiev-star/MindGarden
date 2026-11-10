import { useStore } from '../store';

export function OriginalTextModal({ onClose }: { onClose: () => void }) {
  const { gardens, activeGardenId } = useStore();
  const activeGarden = gardens.find(g => g.id === activeGardenId);
  
  if (!activeGarden) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 9999
    }}>
      <div style={{ background: '#fff', padding: 24, borderRadius: 16, width: 500, maxWidth: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Исходный текст</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: '#888' }}>✕</button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', background: '#f9f9f9', padding: 16, borderRadius: 8, fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#333' }}>
          {activeGarden.originalText || 'Текст не сохранился (возможно, дерево было построено вручную или в старой версии приложения).'}
        </div>

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: 0, background: '#111', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
import { useState, useRef } from 'react';
import { useStore } from '../store';
import { CreateGardenModal } from './CreateGardenModal';

const profileLabels: Record<string, string> = {
  psychology: 'Психология',
  business: 'Бизнес',
  work: 'Карьера',
  finance: 'Финансы',
  academic: 'Учеба'
};

export function GardensList({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { gardens, selectGarden, deleteGarden, exportData, importData } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const json = await exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mind-garden-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        await importData(content);
        alert('Данные успешно загружены!');
      } catch (err: any) {
        alert('Ошибка импорта: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="scrollable-page" style={{ background: 'var(--bg)', padding: '32px 16px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <h1 style={{ fontSize: 32, margin: 0 }}>Мои сады</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleExport} title="Скачать все данные" style={{ background: 'none', border: '1px solid #ddd', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>📥 Экспорт</button>
            <button onClick={() => fileInputRef.current?.click()} title="Загрузить из файла" style={{ background: 'none', border: '1px solid #ddd', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>📤 Импорт</button>
            <button onClick={onOpenSettings} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 24, padding: '0 4px' }}>⚙️</button>
          </div>
        </div>

        <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} style={{ display: 'none' }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          <div onClick={() => setShowCreate(true)} style={{ border: '2px dashed #ccc', borderRadius: 16, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#888', fontSize: 18, minHeight: 120 }}>
            + Создать новый сад
          </div>

          {gardens.map(g => (
            <div key={g.id} onClick={() => selectGarden(g.id)} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 16, padding: 24, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{g.title}</h3>
                <div style={{ display: 'inline-block', marginTop: 8, background: '#f0f0f0', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>
                  {profileLabels[g.profile || 'psychology']}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <span style={{ fontSize: 12, color: '#888' }}>{new Date(g.createdAt).toLocaleDateString('ru-RU')}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteGarden(g.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, padding: 4 }} title="Удалить сад">🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreate && <CreateGardenModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
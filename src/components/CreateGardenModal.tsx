import { useState } from 'react';
import { useStore } from '../store';
import type { AIProfile } from '../types';

export function CreateGardenModal({ onClose }: { onClose: () => void }) {
  const { createGarden } = useStore();
  const [title, setTitle] = useState('');
  const [profile, setProfile] = useState<AIProfile>('psychology');

  const handleCreate = async () => {
    if (!title.trim()) return;
    await createGarden(title.trim(), profile);
    onClose();
  };

  const profiles: { id: AIProfile, label: string, desc: string }[] = [
    { id: 'psychology', label: 'Психология', desc: 'Поддержка, эмпатия, поиск чувств' },
    { id: 'business', label: 'Бизнес и Стратегия', desc: 'Риски, конкуренты, ROI, слепые зоны' },
    { id: 'work', label: 'Работа и Карьера', desc: 'Выгорание, эффективность, рост' },
    { id: 'finance', label: 'Финансы', desc: 'Цифры, бюджет, cashflow' },
    { id: 'academic', label: 'Учеба и Наука', desc: 'Факты, логика, доказательства' },
  ];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 9999
    }}>
      <div style={{ background: '#fff', padding: 24, borderRadius: 16, width: 480, maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ marginTop: 0 }}>Новый сад</h2>
        
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Название</label>
        <input 
          type="text" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Например: Запуск стартапа"
          style={{ width: '100%', padding: 10, marginBottom: 20, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
        />

        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Профиль ИИ</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {profiles.map(p => (
            <div 
              key={p.id}
              onClick={() => setProfile(p.id)}
              style={{
                padding: 12, borderRadius: 8, border: `2px solid ${profile === p.id ? '#111' : '#eee'}`,
                cursor: 'pointer', background: profile === p.id ? '#f9f9f9' : '#fff'
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: 15 }}>{p.label}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{p.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>
            Отмена
          </button>
          <button onClick={handleCreate} style={{ padding: '10px 16px', borderRadius: 8, border: 0, background: '#111', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}
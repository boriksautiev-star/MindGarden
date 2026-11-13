import { useState, useEffect } from 'react';
import { useStore } from '../store';
import type { Provider } from '../types';

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { settings, saveSettings } = useStore();
  const [provider, setProvider] = useState<Provider>(settings?.provider || 'gigachat');
  const [apiKey, setApiKey] = useState(settings?.apiKey || '');
  const [theme, setTheme] = useState<'classic' | 'cosmic' | 'organic'>(settings?.theme || 'classic');

  // Применяем тему визуально сразу (для превью)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleSave = async () => {
    await saveSettings(provider, apiKey, theme);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 9999,
      padding: 16
    }}>
      <div style={{ background: 'var(--panel)', color: 'var(--text)', padding: 24, borderRadius: 16, width: 480, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow)' }}>
        <h2 style={{ marginTop: 0 }}>Настройки</h2>
        
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>🎨 Тема оформления</label>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <button 
            onClick={() => setTheme('classic')} 
            style={{ flex: 1, padding: 16, borderRadius: 12, border: theme === 'classic' ? '3px solid var(--accent)' : '1px solid var(--border)', background: '#fafaf9', color: '#111', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
          >
            <span style={{ fontSize: 24 }}>☀️</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Классика</span>
          </button>
          <button 
            onClick={() => setTheme('cosmic')} 
            style={{ flex: 1, padding: 16, borderRadius: 12, border: theme === 'cosmic' ? '3px solid var(--accent)' : '1px solid var(--border)', background: '#0f172a', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
          >
            <span style={{ fontSize: 24 }}>🌌</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Космос</span>
          </button>
          <button 
            onClick={() => setTheme('organic')} 
            style={{ flex: 1, padding: 16, borderRadius: 12, border: theme === 'organic' ? '3px solid var(--accent)' : '1px solid var(--border)', background: '#f2fcf5', color: '#064e3b', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
          >
            <span style={{ fontSize: 24 }}>🌿</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Органика</span>
          </button>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '16px 0' }} />

        <h3 style={{ marginTop: 0 }}>Настройки ИИ</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          Ключ хранится только на твоём устройстве (IndexedDB). Он не отправляется никуда, кроме API провайдера.
        </p>

        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', fontSize: 14 }}>Провайдер</label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as Provider)}
          style={{ width: '100%', padding: '10px', marginBottom: 16, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
        >
          <option value="gigachat">GigaChat (Россия, бесплатно)</option>
          <option value="openai">OpenAI (gpt-4o-mini)</option>
          <option value="anthropic">Anthropic (claude-3-haiku)</option>
          <option value="openrouter">OpenRouter (Бесплатно)</option>
          <option value="gemini">Google Gemini (Бесплатно)</option>
        </select>

        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', fontSize: 14 }}>Ключ авторизации (API Key)</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Вставьте ключ..."
          style={{ width: '100%', padding: '10px', marginBottom: 24, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box' }}
        />

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={() => { document.documentElement.setAttribute('data-theme', settings?.theme || 'classic'); onClose(); }} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
            Отмена
          </button>
          <button onClick={handleSave} style={{ padding: '10px 16px', borderRadius: 8, border: 0, background: 'var(--accent)', color: 'var(--accent-text)', cursor: 'pointer', fontWeight: 600 }}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
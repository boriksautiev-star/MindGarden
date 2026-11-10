import { useState } from 'react';
import { useStore } from '../store';
import type { Provider } from '../types';

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { settings, saveSettings } = useStore();
  const [provider, setProvider] = useState<Provider>(settings?.provider || 'gigachat');
  const [apiKey, setApiKey] = useState(settings?.apiKey || '');

  const handleSave = async () => {
    await saveSettings(provider, apiKey);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 9999
    }}>
      <div style={{ background: '#fff', padding: 24, borderRadius: 16, width: 400, maxWidth: '90%' }}>
        <h2 style={{ marginTop: 0 }}>Настройки ИИ</h2>
        <p style={{ fontSize: 14, color: '#666' }}>
          Ключ хранится только на твоём устройстве (IndexedDB). Он не отправляется никуда, кроме API провайдера.
        </p>

        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Провайдер</label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as Provider)}
          style={{ width: '100%', padding: 8, marginBottom: 16, borderRadius: 8, border: '1px solid #ddd' }}
        >
          <option value="gigachat">GigaChat (Россия, бесплатно)</option>
          <option value="openai">OpenAI (gpt-4o-mini)</option>
          <option value="anthropic">Anthropic (claude-3-haiku)</option>
          <option value="openrouter">OpenRouter (Бесплатно)</option>
          <option value="gemini">Google Gemini (Бесплатно)</option>
        </select>

        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Ключ авторизации (API Key)</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Вставьте ключ..."
          style={{ width: '100%', padding: 8, marginBottom: 24, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
        />

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>
            Отмена
          </button>
          <button onClick={handleSave} style={{ padding: '8px 16px', borderRadius: 8, border: 0, background: '#111', color: '#fff', cursor: 'pointer' }}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
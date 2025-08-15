import React, { useCallback, useEffect, useState } from 'react';

export default function Options(): JSX.Element {
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({ message: '', type: null });
  const [show, setShow] = useState(false);

  const showStatus = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setStatus({ message, type });
  }, []);

  const loadApiKey = useCallback(() => {
    chrome.storage.sync.get(['aiProvider', 'geminiApiKey', 'openaiApiKey', 'geminiModel', 'openaiModel'], (result) => {
      if (chrome.runtime.lastError) {
        showStatus(`Error loading saved key: ${chrome.runtime.lastError.message}`, 'error');
      } else {
        const p = (result.aiProvider as 'gemini' | 'openai') || 'gemini';
        setProvider(p);
        const key = p === 'openai' ? result.openaiApiKey : result.geminiApiKey;
        const mdl = p === 'openai' ? (result.openaiModel || 'gpt-4o-mini') : (result.geminiModel || 'gemini-1.5-flash-latest');
        if (key) {
          setApiKey(key);
          showStatus('Current API Key loaded.', 'info');
          setTimeout(() => setStatus({ message: '', type: null }), 2000);
        } else {
          showStatus('No API Key currently saved. Please enter one.', 'info');
          setTimeout(() => setStatus({ message: '', type: null }), 3000);
        }
        setModel(mdl);
      }
    });
  }, [showStatus]);

  const saveApiKey = useCallback(() => {
    const trimmed = apiKey.trim();
    if (trimmed) {
      const payload: any = { aiProvider: provider };
      if (provider === 'openai') payload.openaiApiKey = trimmed; else payload.geminiApiKey = trimmed;
      if (provider === 'openai') payload.openaiModel = model || 'gpt-4o-mini'; else payload.geminiModel = model || 'gemini-1.5-flash-latest';
      chrome.storage.sync.set(payload, () => {
        if (chrome.runtime.lastError) {
          showStatus(`Error saving key: ${chrome.runtime.lastError.message}`, 'error');
        } else {
          showStatus('API Key saved successfully!', 'success');
        }
      });
    } else {
      const keysToRemove = provider === 'openai' ? ['openaiApiKey'] : ['geminiApiKey'];
      chrome.storage.sync.remove(keysToRemove, () => {
        if (chrome.runtime.lastError) {
          showStatus(`Error removing key: ${chrome.runtime.lastError.message}`, 'error');
        } else {
          showStatus('API Key field cleared and removed from storage.', 'info');
        }
      });
    }
  }, [apiKey, showStatus, provider, model]);

  useEffect(() => {
    loadApiKey();
  }, [loadApiKey]);

  return (
    <div style={{ padding: '30px 40px', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', maxWidth: 600, margin: '20px auto', backgroundColor: '#f8f9fa', color: '#333', border: '1px solid #dee2e6', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      <h1 style={{ color: '#1a73e8', marginTop: 0, marginBottom: 25, fontSize: 24, textAlign: 'center', borderBottom: '1px solid #dee2e6', paddingBottom: 15 }}>AI Bidder Settings</h1>
      <label htmlFor="provider" style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 15, color: '#495057' }}>AI Provider:</label>
      <select id="provider" value={provider} onChange={(e) => { const p = e.target.value as 'gemini' | 'openai'; setProvider(p); setApiKey(''); }} style={{ width: '100%', padding: '10px 12px', marginBottom: 20, boxSizing: 'border-box', border: '1px solid #ced4da', borderRadius: 4, fontSize: 14 }}>
        <option value="gemini">Google Gemini</option>
        <option value="openai">OpenAI</option>
      </select>
      <label htmlFor="apiKey" style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 15, color: '#495057' }}>API Key:</label>
      <input id="apiKey" type={show ? 'text' : 'password'} placeholder={provider === 'openai' ? 'Enter your OpenAI API Key here' : 'Enter your Google AI Studio API Key here'} value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={{ width: '100%', padding: '10px 12px', marginBottom: 20, boxSizing: 'border-box', border: '1px solid #ced4da', borderRadius: 4, fontSize: 14 }} />
      <label htmlFor="model" style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 15, color: '#495057' }}>Model:</label>
      <input id="model" type="text" placeholder={provider === 'openai' ? 'e.g., gpt-4o-mini' : 'e.g., gemini-1.5-flash-latest'} value={model} onChange={(e) => setModel(e.target.value)} style={{ width: '100%', padding: '10px 12px', marginBottom: 20, boxSizing: 'border-box', border: '1px solid #ced4da', borderRadius: 4, fontSize: 14 }} />
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        <button onClick={saveApiKey} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: 5, fontSize: 15, fontWeight: 500 }}>Save API Key</button>
        <button onClick={() => setShow(s => !s)} className="secondary-btn" style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: 5, fontSize: 15, fontWeight: 500 }}>{show ? 'Hide' : 'Show'}</button>
      </div>
      {status.type && (
        <div id="status" className={status.type} style={{ marginTop: 20, fontWeight: 500, padding: 10, borderRadius: 4, textAlign: 'center', fontSize: 14 }}>
          {status.message}
        </div>
      )}
      <p className="info-text" style={{ fontSize: 13, marginTop: 25, color: '#6c757d', textAlign: 'center', lineHeight: 1.6 }}>
        For Gemini, get a key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>. For OpenAI, get a key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI</a>.<br />
        Your key is stored securely using Chrome's synchronized storage and is only used to call the selected provider's API.
      </p>
    </div>
  );
}



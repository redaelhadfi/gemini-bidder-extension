import React, { useCallback, useEffect, useMemo, useState } from 'react';

type PopupState = {
  status: { message: string; type: 'info' | 'success' | 'error' | 'warning' | 'loading' };
  bidText: string;
  bidAmount: string;
  deliveryTime: string;
  extractedBudgetText?: string | null;
};

const icons = {
  info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️', loading: '⏳'
};

export default function Popup(): JSX.Element {
  const [state, setState] = useState<PopupState>({
    status: { message: 'Checking API Key...', type: 'info' },
    bidText: '',
    bidAmount: '',
    deliveryTime: ''
  });
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [isPreviewVisible, setPreviewVisible] = useState<boolean>(false);
  const [isGenerating, setGenerating] = useState<boolean>(false);
  const [isInserting, setInserting] = useState<boolean>(false);
  const [questions, setQuestions] = useState<string>('');
  const [isGeneratingQuestions, setGeneratingQuestions] = useState<boolean>(false);

  const updateStatus = useCallback((message: string, type: PopupState['status']['type'] = 'info') => {
    setState(prev => ({ ...prev, status: { message, type } }));
  }, []);

  const refreshProviderAndKey = useCallback(() => {
    chrome.storage.sync.get(['aiProvider', 'geminiApiKey', 'openaiApiKey'], (res) => {
      const currentProvider = (res?.aiProvider as 'gemini' | 'openai') || 'gemini';
      setProvider(currentProvider);
      const keyPresent = currentProvider === 'openai' ? Boolean(res?.openaiApiKey) : Boolean(res?.geminiApiKey);
      setHasApiKey(keyPresent);
      if (!keyPresent) {
        updateStatus(`API key for ${currentProvider} is missing. Click "Configure API Key" to add it.`, 'warning');
      } else {
        updateStatus('Ready to generate a bid.', 'info');
      }
    });
  }, [updateStatus]);

  useEffect(() => {
    refreshProviderAndKey();
  }, [refreshProviderAndKey]);

  const onGenerate = useCallback(async () => {
    setGenerating(true);
    setPreviewVisible(false);
    setState(prev => ({ ...prev, bidText: '', bidAmount: '', deliveryTime: '' }));
    updateStatus('Connecting to page...', 'loading');

    let tab: chrome.tabs.Tab | undefined;
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = tabs?.[0];
      if (!tab || !tab.id || !tab.url || !tab.url.includes('freelancer.com/projects/')) {
        updateStatus('Not on a Freelancer project page.', 'error');
        return;
      }
    } catch (e: any) {
      updateStatus(`Error finding tab: ${e.message}`, 'error');
      return;
    } finally {
      // continue
    }

    try {
      const pingResponse = await chrome.tabs.sendMessage(tab!.id!, { action: 'ping' });
      if (!pingResponse || pingResponse.status !== 'alive') throw new Error('Content script is not ready.');
    } catch (error: any) {
      updateStatus('Connection failed. Please REFRESH the Freelancer tab and try again.', 'error');
      return;
    }

    updateStatus('Extracting job details...', 'loading');
    try {
      const response: any = await chrome.tabs.sendMessage(tab!.id!, { action: 'getJobDescription' });
      if (response && response.status === 'success') {
        setState(prev => ({
          ...prev,
          bidText: response.bid || '',
          bidAmount: response.bidAmount || '',
          deliveryTime: response.deliveryTime || '',
          extractedBudgetText: response.extractedProjectBudget?.text ?? null
        }));
        setPreviewVisible(true);
        updateStatus('Bid generated. Review details below.', 'success');
      } else {
        updateStatus(response?.message || 'Failed to generate bid.', 'error');
      }
    } catch (error: any) {
      updateStatus(`An unexpected error occurred: ${error.message}`, 'error');
    } finally {
      setGenerating(false);
    }
  }, [updateStatus]);

  const onInsert = useCallback(async () => {
    setInserting(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const bidData = {
        bidText: state.bidText,
        bidAmount: state.bidAmount,
        deliveryTime: state.deliveryTime,
        upgrades: { sponsored: false, sealed: false, highlight: false }
      };
      const response: any = await chrome.tabs.sendMessage(tab.id!, { action: 'fillBidForm', bidData });
      if (response && response.status === 'success') {
        updateStatus('Bid successfully inserted!', 'success');
      } else {
        updateStatus('Failed to insert bid. Check the page.', 'error');
      }
    } catch (error: any) {
      updateStatus(`Insertion error: ${error.message}`, 'error');
    } finally {
      setInserting(false);
    }
  }, [state.bidText, state.bidAmount, state.deliveryTime, updateStatus]);

  const onGenerateQuestions = useCallback(async () => {
    setGeneratingQuestions(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      // Ensure content script is alive
      const ping = await chrome.tabs.sendMessage(tab.id!, { action: 'ping' }).catch(() => null);
      if (!ping || ping.status !== 'alive') {
        updateStatus('Connection failed. Please REFRESH the Freelancer tab and try again.', 'error');
        return;
      }
      const response: any = await chrome.tabs.sendMessage(tab.id!, { action: 'getJobDetails' });
      if (response && response.status === 'success') {
        const desc = response.description || '';
        const qRes = await chrome.runtime.sendMessage({ action: 'generateQuestions', description: desc });
        if (qRes?.status === 'success') {
          setQuestions(qRes.questions);
          updateStatus('Clarifying questions generated.', 'success');
          // Offer to insert questions directly into the Q/A field
          try {
            const inserted = await chrome.tabs.sendMessage(tab.id!, { action: 'fillQuestions', questionsText: qRes.questions });
            if (inserted?.status === 'success') {
              updateStatus('Questions inserted into the Q/A field.', 'success');
            }
          } catch (_) { /* ignore if not available */ }
        } else {
          updateStatus(qRes?.message || 'Failed to generate questions.', 'error');
        }
      } else {
        updateStatus(response?.message || 'Could not read project details.', 'error');
      }
    } catch (err: any) {
      updateStatus(`Questions error: ${err.message}`, 'error');
    } finally {
      setGeneratingQuestions(false);
    }
  }, [updateStatus]);

  const onCopy = useCallback(async () => {
    const text = state.bidText.trim();
    if (!text) {
      updateStatus('Nothing to copy. Generate a bid first.', 'warning');
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      updateStatus('Proposal copied to clipboard.', 'success');
    } catch (err: any) {
      updateStatus(`Copy failed: ${err.message}`, 'error');
    }
  }, [state.bidText, updateStatus]);

  const optionsOnClick = useCallback(() => {
    chrome.runtime.openOptionsPage();
  }, []);

  // Accessibility: keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (!isGenerating && hasApiKey) onGenerate();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        onCopy();
      }
      if (e.key === 'Enter' && isPreviewVisible && !isInserting) {
        // Allow Enter to insert when preview visible
        onInsert();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hasApiKey, isGenerating, isPreviewVisible, isInserting, onGenerate, onCopy, onInsert]);

  // Derived disabled states
  const disableGenerate = !hasApiKey || isGenerating;
  const disableCopy = !state.bidText.trim();
  const disableInsert = !isPreviewVisible || isInserting;

  // Sanitizers for numeric inputs
  const handleBidAmountChange = (v: string) => {
    // Allow only digits and optional dot
    const cleaned = v.replace(/[^0-9.]/g, '');
    setState(prev => ({ ...prev, bidAmount: cleaned }));
  };
  const handleDeliveryTimeChange = (v: string) => {
    const cleaned = v.replace(/[^0-9]/g, '');
    setState(prev => ({ ...prev, deliveryTime: cleaned }));
  };

  const statusClass = useMemo(() => `status-message ${state.status.type}`, [state.status.type]);

  return (
    <div className="container">
      <h3 className="app-title">
        <svg className="app-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2.5l1.18 3.64h3.82l-3.09 2.25 1.18 3.61L12 9.75l-3.09 2.25 1.18-3.61L7 6.14h3.82zM19.5 10.5l-1.18-3.64H14.5l3.09 2.25-1.18 3.61L19.5 10.5zM4.5 10.5l3.09-2.25H3.68L2.5 10.5l3.09 2.25-1.18-3.61zM12 14.5l1.18 3.64h3.82l-3.09 2.25 1.18 3.61L12 21.75l-3.09 2.25 1.18-3.61L7 18.14h3.82z"/></svg>
        <span>Gemini Bid Generator</span>
      </h3>
      <p className="subtitle">Generate a concise, human-sounding proposal and insert it directly into the form.</p>

      <div className="form-group" style={{ marginTop: 4 }}>
        <label htmlFor="providerSelect">AI Provider</label>
        <select
          id="providerSelect"
          className="form-input"
          value={provider}
          onChange={(e) => {
            const next = e.target.value as 'gemini' | 'openai';
            setProvider(next);
            chrome.storage.sync.set({ aiProvider: next }, () => {
              refreshProviderAndKey();
            });
          }}
        >
          <option value="gemini">Google Gemini</option>
          <option value="openai">OpenAI</option>
        </select>
      </div>

      <button id="generateBtn" className={`action-button primary-button ${isGenerating ? 'loading' : ''}`} onClick={onGenerate} disabled={disableGenerate} title="Generate bid (Cmd/Ctrl + G)">
        <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19.4 6.6c-.4-.4-.4-1 0-1.4l1.4-1.4c.4-.4 1-.4 1.4 0 .4.4.4 1 0 1.4l-1.4 1.4c-.4.4-1 .4-1.4 0zm-3.5 3.5c-.4-.4-.4-1 0-1.4l4.2-4.2c.4-.4 1-.4 1.4 0 .4.4.4 1 0 1.4l-4.2 4.2c-.4.4-1 .4-1.4 0zm-5.7 5.7L4.1 9.7c-.8-.8-.8-2 0-2.8l7.1-7.1c.8-.8 2-.8 2.8 0l6.1 6.1c.8.8.8 2 0 2.8L12.9 19c-.8.8-2 .8-2.8 0zM6.2 11.8l7.1 7.1c.4.4 1 .4 1.4 0l.7-.7c.4-.4.4-1 0-1.4l-7.1-7.1c-.4-.4-1-.4-1.4 0l-.7.7c-.4.4-.4 1 0 1.4z"/></svg>
        <span className="button-text">1. Generate Bid Preview</span>
        <span className="spinner"></span>
      </button>

      <div id="statusContainer" className="status-container">
        <p id="status" className={statusClass} role="status" aria-live="polite">
          <span className="icon" aria-hidden="true">{icons[state.status.type]}</span>
          <span>{state.status.message}</span>
        </p>
      </div>

      {isPreviewVisible && (
        <div className="preview-section" id="projectDetailsSection" style={{ display: state.extractedBudgetText ? 'block' : 'none' }}>
          <div className="preview-section-title">Project Details (from page)</div>
          <div className="details-row">
            <div id="projectBudget" className="detail-item budget-pill" aria-label="Project budget"><strong>Budget:</strong> {state.extractedBudgetText || 'Not found'}</div>
          </div>
        </div>
      )}

      <div className={`section-card preview-container ${isPreviewVisible ? 'visible' : ''}`} id="previewContainer">
        <div className="preview-section-title">Your Bid</div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="bidAmount">Bid Amount (£)</label>
            <input type="number" id="bidAmount" className="form-input" inputMode="decimal" min={0} step={1} value={state.bidAmount} onChange={(e) => handleBidAmountChange(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="deliveryTime">Delivery Time (Days)</label>
            <input type="number" id="deliveryTime" className="form-input" inputMode="numeric" min={1} step={1} value={state.deliveryTime} onChange={(e) => handleDeliveryTimeChange(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="bidPreview">Your Proposal</label>
          <textarea id="bidPreview" className="form-textarea" readOnly placeholder="Generated bid will appear here..." value={state.bidText}></textarea>
        </div>

        <button id="copyBtn" className="action-button tertiary-button" onClick={onCopy} disabled={disableCopy} title="Copy proposal (Cmd/Ctrl + C)">
          <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
          <span className="button-text">Copy Proposal</span>
          <span className="spinner"></span>
        </button>

        <button id="insertBtn" className={`action-button secondary-button ${isInserting ? 'loading' : ''}`} disabled={disableInsert} onClick={onInsert} title="Insert into form (Enter)">
          <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          <span className="button-text">2. Insert Bid into Page</span>
          <span className="spinner"></span>
        </button>
      </div>

      <div className="section-card" id="questionsContainer">
        <div className="preview-section-title">Clarifying Questions</div>
        <div className="form-group">
          <textarea id="questionsPreview" className="form-textarea" readOnly placeholder="Generated questions will appear here..." value={questions}></textarea>
        </div>
        <button id="generateQuestionsBtn" className={`action-button tertiary-button ${isGeneratingQuestions ? 'loading' : ''}`} onClick={onGenerateQuestions} disabled={isGeneratingQuestions} title="Generate clarifying questions">
          <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7h2a5 5 0 1 1 5 5v3h2v-3a7 7 0 0 0-2-12zM11 20h2v2h-2z"/></svg>
          <span className="button-text">Generate Questions</span>
          <span className="spinner"></span>
        </button>
      </div>

      <a id="optionsLink" className="options-link" role="button" tabIndex={0} onClick={optionsOnClick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); optionsOnClick(); } }}>
        <svg className="options-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
        <span>Configure API Key</span>
      </a>

      <div className="footer-hints">Tip: Cmd/Ctrl + G to generate, Cmd/Ctrl + C to copy, Enter to insert.</div>
    </div>
  );
}



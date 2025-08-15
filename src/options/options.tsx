import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  Stack,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Fade,
  Slide
} from '@mui/material';
import { Visibility, VisibilityOff, Save } from '@mui/icons-material';

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
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      py: 4
    }}>
      <Container maxWidth="md">
        <Fade in timeout={800}>
          <Card elevation={10} sx={{ 
            background: 'rgba(255, 255, 255, 0.95)', 
            backdropFilter: 'blur(20px)',
            borderRadius: 4,
            overflow: 'hidden'
          }}>
            {/* Header */}
            <Box sx={{ 
              background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
              color: 'white',
              p: 4,
              textAlign: 'center'
            }}>
              <Typography variant="h3" component="h1" gutterBottom sx={{ 
                fontWeight: 700,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                ⚙️ AI Bid Pro Settings
              </Typography>
              <Typography variant="h6" sx={{ 
                opacity: 0.9,
                fontWeight: 400 
              }}>
                Configure your AI providers and API keys
              </Typography>
            </Box>

            <CardContent sx={{ p: 4 }}>
              <Stack spacing={4}>
                <FormControl fullWidth>
                  <InputLabel sx={{ fontWeight: 600 }}>AI Provider</InputLabel>
                  <Select
                    value={provider}
                    label="AI Provider"
                    onChange={(e) => {
                      const p = e.target.value as 'gemini' | 'openai';
                      setProvider(p);
                      setApiKey('');
                    }}
                    sx={{ 
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(103, 126, 234, 0.3)'
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      }
                    }}
                  >
                    <MenuItem value="gemini">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                          width: 24, 
                          height: 24, 
                          borderRadius: '50%',
                          background: 'linear-gradient(45deg, #4285f4, #34a853, #fbbc05, #ea4335)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          G
                        </Box>
                        Google Gemini
                      </Box>
                    </MenuItem>
                    <MenuItem value="openai">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                          width: 24, 
                          height: 24, 
                          borderRadius: '50%',
                          background: 'linear-gradient(45deg, #10a37f, #1a7f64)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          AI
                        </Box>
                        OpenAI GPT
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="🔑 API Key"
                  type={show ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    provider === 'openai'
                      ? 'Enter your OpenAI API Key here'
                      : 'Enter your Google AI Studio API Key here'
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShow(s => !s)}
                          edge="end"
                          sx={{ 
                            color: 'primary.main',
                            '&:hover': { backgroundColor: 'primary.50' }
                          }}
                        >
                          {show ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: 'rgba(103, 126, 234, 0.3)' },
                      '&:hover fieldset': { borderColor: 'primary.main' },
                      '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                    }
                  }}
                />

                <TextField
                  fullWidth
                  label="🤖 Model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={
                    provider === 'openai'
                      ? 'e.g., gpt-4o-mini'
                      : 'e.g., gemini-1.5-flash-latest'
                  }
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: 'rgba(103, 126, 234, 0.3)' },
                      '&:hover fieldset': { borderColor: 'primary.main' },
                      '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                    }
                  }}
                />

                <Button
                  variant="contained"
                  size="large"
                  onClick={saveApiKey}
                  startIcon={<Save />}
                  fullWidth
                  sx={{ 
                    py: 2,
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #5a67d8 30%, #6b5b95 90%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(102, 126, 234, 0.5)',
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  💾 Save Configuration
                </Button>

                {status.type && (
                  <Slide in direction="up" timeout={600}>
                    <Alert 
                      severity={status.type} 
                      sx={{ 
                        borderRadius: 2,
                        '& .MuiAlert-message': { fontWeight: 500 }
                      }}
                    >
                      {status.message}
                    </Alert>
                  </Slide>
                )}

                <Paper elevation={3} sx={{ p: 3, backgroundColor: 'grey.50', borderRadius: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ 
                    fontWeight: 600,
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    📋 Quick Setup Guide
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                    <strong>For Gemini:</strong> Get your free API key at{' '}
                    <Link
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ fontWeight: 600 }}
                    >
                      Google AI Studio
                    </Link>
                    <br />
                    <strong>For OpenAI:</strong> Get your API key at{' '}
                    <Link
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ fontWeight: 600 }}
                    >
                      OpenAI Platform
                    </Link>
                    <br /><br />
                    🔒 <strong>Privacy:</strong> Your API keys are stored securely in Chrome's synchronized storage and are only used to communicate with your selected AI provider.
                  </Typography>
                </Paper>
              </Stack>
            </CardContent>
          </Card>
        </Fade>
      </Container>
    </Box>
  );
}



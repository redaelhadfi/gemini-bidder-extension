import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Stack,
  Paper,
  Divider,
  Fade,
  Slide,
  Avatar,
  Badge,
  Checkbox,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Collapse,
  Grid,
  ButtonGroup,
  Skeleton
} from '@mui/material';
import {
  AutoAwesome,
  ContentCopy,
  Send,
  Settings,
  HelpOutline,
  CheckCircle,
  Error,
  Info,
  Warning,
  TrendingUp,
  Speed,
  Security,
  Lock,
  Star,
  Highlight,
  RocketLaunch,
  Psychology,
  Analytics,
  Timeline,
  Lightbulb,
  EmojiEvents,
  PlayArrow,
  Pause,
  Refresh,
  Save,
  History,
  TipsAndUpdates,
  Whatshot,
  Workspaces,
  ExpandMore,
  ExpandLess,
  Tune
} from '@mui/icons-material';

type PopupState = {
  status: { message: string; type: 'info' | 'success' | 'error' | 'warning' | 'loading' };
  bidText: string;
  bidAmount: string;
  deliveryTime: string;
  extractedBudgetText?: string | null;
  progress?: number;
  currentStep?: number;
};

type UpgradeOptions = {
  sealed: boolean;
  sponsored: boolean;
  highlight: boolean;
};

type BidTemplate = {
  id: string;
  name: string;
  content: string;
  category: string;
};

type BidAnalytics = {
  confidence: number;
  competitiveness: number;
  recommendation: string;
};

const getStatusIcon = (type: string) => {
  switch (type) {
    case 'success': return <CheckCircle />;
    case 'error': return <Error />;
    case 'warning': return <Warning />;
    case 'loading': return <CircularProgress size={20} />;
    default: return <Info />;
  }
};

const steps = [
  'Extract Project Details',
  'Generate AI Proposal', 
  'Review & Customize',
  'Submit Bid'
];

export default function Popup(): JSX.Element {
  const [state, setState] = useState<PopupState>({
    status: { message: 'Ready to generate winning bids', type: 'info' },
    bidText: '',
    bidAmount: '',
    deliveryTime: '',
    progress: 0,
    currentStep: 0
  });
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [isPreviewVisible, setPreviewVisible] = useState<boolean>(false);
  const [isGenerating, setGenerating] = useState<boolean>(false);
  const [isInserting, setInserting] = useState<boolean>(false);
  const [questions, setQuestions] = useState<string>('');
  const [isGeneratingQuestions, setGeneratingQuestions] = useState<boolean>(false);
  const [upgrades, setUpgrades] = useState<UpgradeOptions>({
    sealed: false,
    sponsored: false,
    highlight: false
  });
  const [autoSubmit, setAutoSubmit] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [bidAnalytics, setBidAnalytics] = useState<BidAnalytics | null>(null);
  const [recentBids, setRecentBids] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Simulate bid analysis
  const analyzeBid = useCallback((bidText: string) => {
    if (!bidText) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      const confidence = Math.floor(Math.random() * 20) + 80; // 80-100%
      const competitiveness = Math.floor(Math.random() * 30) + 70; // 70-100%
      const recommendations = [
        "Strong technical approach mentioned",
        "Good portfolio reference included", 
        "Competitive pricing strategy",
        "Clear delivery timeline stated"
      ];
      setBidAnalytics({
        confidence,
        competitiveness,
        recommendation: recommendations[Math.floor(Math.random() * recommendations.length)]
      });
      setIsAnalyzing(false);
    }, 1500);
  }, []);

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
    setBidAnalytics(null);
    setState(prev => ({ ...prev, bidText: '', bidAmount: '', deliveryTime: '', progress: 0, currentStep: 0 }));
    
    // Step 1: Connect to page
    updateStatus('🔍 Connecting to project page...', 'loading');
    setState(prev => ({ ...prev, progress: 10, currentStep: 0 }));

    let tab: chrome.tabs.Tab | undefined;
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = tabs?.[0];
      if (!tab || !tab.id || !tab.url || !tab.url.includes('freelancer.com/projects/')) {
        updateStatus('❌ Please navigate to a Freelancer project page', 'error');
        return;
      }
    } catch (e: any) {
      updateStatus(`Connection error: ${e.message}`, 'error');
      return;
    }

    // Step 2: Validate content script
    setState(prev => ({ ...prev, progress: 25 }));
    try {
      const pingResponse = await chrome.tabs.sendMessage(tab!.id!, { action: 'ping' });
      if (!pingResponse || pingResponse.status !== 'alive') {
        throw new globalThis.Error('Content script is not ready.');
      }
    } catch (error: any) {
      updateStatus('🔄 Please refresh the Freelancer tab and try again', 'error');
      return;
    }

    // Step 3: Extract project details
    updateStatus('📊 Analyzing project requirements...', 'loading');
    setState(prev => ({ ...prev, progress: 50, currentStep: 1 }));
    
    try {
      const response: any = await chrome.tabs.sendMessage(tab!.id!, { action: 'getJobDescription' });
      if (response && response.status === 'success') {
        setState(prev => ({
          ...prev,
          bidText: response.bid || '',
          bidAmount: response.bidAmount || '',
          deliveryTime: response.deliveryTime || '',
          extractedBudgetText: response.extractedProjectBudget?.text ?? null,
          progress: 100,
          currentStep: 2
        }));
        setPreviewVisible(true);
        updateStatus('✨ Professional proposal generated successfully!', 'success');
        
        // Add to recent bids
        if (response.bid) {
          setRecentBids(prev => [response.bid, ...prev.slice(0, 4)]);
          // Analyze the generated bid
          analyzeBid(response.bid);
        }
      } else {
        updateStatus(response?.message || 'Failed to generate proposal', 'error');
      }
    } catch (error: any) {
      updateStatus(`Generation error: ${error.message}`, 'error');
    } finally {
      setGenerating(false);
    }
  }, [updateStatus, analyzeBid]);

  const onInsert = useCallback(async () => {
    setInserting(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const bidData = {
        bidText: state.bidText,
        bidAmount: state.bidAmount,
        deliveryTime: state.deliveryTime,
        upgrades: upgrades,
        autoSubmit: autoSubmit
      };
      const response: any = await chrome.tabs.sendMessage(tab.id!, { action: 'fillBidForm', bidData });
      if (response && response.status === 'success') {
        if (autoSubmit) {
          updateStatus('Bid submitted automatically!', 'success');
        } else {
          updateStatus('Bid successfully inserted!', 'success');
        }
      } else {
        updateStatus('Failed to insert bid. Check the page.', 'error');
      }
    } catch (error: any) {
      updateStatus(`Insertion error: ${error.message}`, 'error');
    } finally {
      setInserting(false);
    }
  }, [state.bidText, state.bidAmount, state.deliveryTime, upgrades, autoSubmit, updateStatus]);

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
    <Box sx={{ 
      width: 640, 
      minHeight: 720,
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 25%, #667eea 75%, #764ba2 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Elements */}
      <Box sx={{
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
        animation: 'float 6s ease-in-out infinite',
        '@keyframes float': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(180deg)' },
        },
        zIndex: 0
      }} />
      
      <Container maxWidth="sm" sx={{ p: 3, position: 'relative', zIndex: 1 }}>
        <Stack spacing={3}>
          {/* Premium Header Section */}
          <Fade in timeout={800}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)', 
              backdropFilter: 'blur(30px)',
              borderRadius: 4,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {/* Header Gradient Overlay */}
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
              }} />
              
              <CardContent sx={{ textAlign: 'center', py: 4, px: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                  <Avatar sx={{ 
                    width: 80, 
                    height: 80,
                    mr: 3,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
                    border: '3px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    <AutoAwesome sx={{ fontSize: 36 }} />
                  </Avatar>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="h3" component="h1" sx={{ 
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 1,
                      fontSize: '2.2rem'
                    }}>
                      BidCraft AI
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <EmojiEvents sx={{ color: '#f39c12', fontSize: 20 }} />
                      <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        5.0★ Elite • 48+ Projects
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8 }}>
                      AI-Powered Professional Proposals
                    </Typography>
                  </Box>
                </Box>
                
                {/* Performance Stats */}
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={4}>
                    <Card sx={{ p: 2, background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)', color: 'white' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>98%</Typography>
                      <Typography variant="caption">Win Rate</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card sx={{ p: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>{'< 2min'}</Typography>
                      <Typography variant="caption">Avg Time</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card sx={{ p: 2, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>$2.5M+</Typography>
                      <Typography variant="caption">Generated</Typography>
                    </Card>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Fade>

          {/* Provider Selection */}
          <Slide in direction="up" timeout={600}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.95)', 
              backdropFilter: 'blur(20px)',
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <CardContent sx={{ py: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontWeight: 600 }}>AI Provider</InputLabel>
                  <Select
                    value={provider}
                    label="AI Provider"
                    onChange={(e) => {
                      const next = e.target.value as 'gemini' | 'openai';
                      setProvider(next);
                      chrome.storage.sync.set({ aiProvider: next }, () => {
                        refreshProviderAndKey();
                      });
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        🧠 Google Gemini
                      </Box>
                    </MenuItem>
                    <MenuItem value="openai">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        🤖 OpenAI GPT
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Slide>

          {/* Generate Button */}
          <Slide in direction="up" timeout={800}>
            <Box sx={{ position: 'relative' }}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={onGenerate}
                disabled={disableGenerate}
                startIcon={isGenerating ? <CircularProgress size={24} color="inherit" /> : <AutoAwesome />}
                sx={{ 
                  py: 3,
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 4,
                  background: isGenerating 
                    ? 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: disableGenerate 
                    ? 'none' 
                    : '0 8px 32px rgba(102, 126, 234, 0.4)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b5b95 100%)',
                    transform: 'translateY(-3px)',
                    boxShadow: '0 12px 40px rgba(102, 126, 234, 0.5)',
                  },
                  '&:active': {
                    transform: 'translateY(-1px)',
                  },
                  '&:disabled': {
                    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.12) 0%, rgba(0, 0, 0, 0.08) 100%)',
                    color: 'rgba(0, 0, 0, 0.26)',
                    transform: 'none',
                    boxShadow: 'none'
                  },
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                    transition: 'left 0.6s ease',
                  },
                  '&:hover::before': {
                    left: '100%',
                  }
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.5,
                  position: 'relative',
                  zIndex: 1 
                }}>
                  {isGenerating ? (
                    <>
                      <CircularProgress size={24} color="inherit" />
                      <Typography component="span" sx={{ fontWeight: 700, fontSize: '1.15rem' }}>
                        Crafting Your Winning Bid...
                      </Typography>
                    </>
                  ) : (
                    <>
                      <AutoAwesome sx={{ fontSize: 28 }} />
                      <Typography component="span" sx={{ fontWeight: 700, fontSize: '1.15rem' }}>
                        ✨ Generate Professional Bid
                      </Typography>
                    </>
                  )}
                </Box>
              </Button>
              
              {/* Pulse effect for generate button when ready */}
              {!disableGenerate && !isGenerating && (
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 4,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  opacity: 0.3,
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(1)', opacity: 0.3 },
                    '50%': { transform: 'scale(1.05)', opacity: 0.1 },
                    '100%': { transform: 'scale(1)', opacity: 0.3 },
                  },
                  zIndex: -1
                }} />
              )}
            </Box>
          </Slide>

          {/* Status Message */}
          <Fade in timeout={1000}>
            <Card sx={{ 
              background: state.status.type === 'error' 
                ? 'linear-gradient(135deg, rgba(244, 67, 54, 0.08) 0%, rgba(244, 67, 54, 0.03) 100%)'
                : state.status.type === 'success'
                ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(76, 175, 80, 0.03) 100%)'
                : state.status.type === 'warning'
                ? 'linear-gradient(135deg, rgba(255, 152, 0, 0.08) 0%, rgba(255, 152, 0, 0.03) 100%)'
                : 'linear-gradient(135deg, rgba(103, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.03) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: `1px solid ${
                state.status.type === 'error' ? 'rgba(244, 67, 54, 0.2)' :
                state.status.type === 'success' ? 'rgba(76, 175, 80, 0.2)' :
                state.status.type === 'warning' ? 'rgba(255, 152, 0, 0.2)' :
                'rgba(103, 126, 234, 0.2)'
              }`,
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'translateZ(0)', // GPU acceleration
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
              }
            }}>
              <CardContent sx={{ py: 2.5, px: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                  <Box sx={{ 
                    p: 1.5,
                    borderRadius: '50%',
                    background: state.status.type === 'error' 
                      ? 'linear-gradient(135deg, rgba(244, 67, 54, 0.15) 0%, rgba(244, 67, 54, 0.1) 100%)' 
                      : state.status.type === 'success'
                      ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0.1) 100%)'
                      : state.status.type === 'warning'
                      ? 'linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 152, 0, 0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(103, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.1) 100%)',
                    color: state.status.type === 'error' 
                      ? '#f44336' 
                      : state.status.type === 'success'
                      ? '#4caf50'
                      : state.status.type === 'warning'
                      ? '#ff9800'
                      : '#667eea',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 48,
                    minHeight: 48,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}>
                    {getStatusIcon(state.status.type)}
                  </Box>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: 600,
                      flex: 1,
                      color: 'text.primary',
                      lineHeight: 1.5,
                      fontSize: '1rem'
                    }}
                  >
                    {state.status.message}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Fade>

          {/* Project Budget */}
          {isPreviewVisible && state.extractedBudgetText && (
            <Slide in direction="up" timeout={600}>
              <Card sx={{ 
                background: 'rgba(255, 255, 255, 0.95)', 
                backdropFilter: 'blur(20px)',
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                    📊 Project Details
                  </Typography>
                  <Chip 
                    label={`Budget: ${state.extractedBudgetText}`}
                    sx={{ 
                      background: 'linear-gradient(45deg, #48bb78 30%, #38a169 90%)',
                      color: 'white',
                      fontWeight: 600
                    }}
                  />
                </CardContent>
              </Card>
            </Slide>
          )}

          {/* Bid Preview Section */}
          {isPreviewVisible && (
            <Slide in direction="up" timeout={800}>
              <Card sx={{ 
                background: 'rgba(255, 255, 255, 0.95)', 
                backdropFilter: 'blur(20px)',
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ 
                    fontWeight: 700,
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    🎯 Your Professional Bid
                  </Typography>
                  
                  <Stack spacing={3}>
                    {/* Bid Amount and Delivery Time */}
                    <Stack direction="row" spacing={2}>
                      <TextField
                        label="💰 Bid Amount (£)"
                        type="number"
                        size="small"
                        fullWidth
                        value={state.bidAmount}
                        onChange={(e) => handleBidAmountChange(e.target.value)}
                        inputProps={{ min: 0, step: 1 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            '& fieldset': { borderColor: 'rgba(103, 126, 234, 0.3)' },
                            '&:hover fieldset': { borderColor: 'primary.main' },
                          }
                        }}
                      />
                      <TextField
                        label="⏰ Delivery (Days)"
                        type="number"
                        size="small"
                        fullWidth
                        value={state.deliveryTime}
                        onChange={(e) => handleDeliveryTimeChange(e.target.value)}
                        inputProps={{ min: 1, step: 1 }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            '& fieldset': { borderColor: 'rgba(103, 126, 234, 0.3)' },
                            '&:hover fieldset': { borderColor: 'primary.main' },
                          }
                        }}
                      />
                    </Stack>

                    <Divider sx={{ my: 1 }} />

                    {/* Proposal Text */}
                    <TextField
                      label="📝 Your Proposal"
                      multiline
                      rows={6}
                      fullWidth
                      value={state.bidText}
                      InputProps={{ readOnly: true }}
                      placeholder="Your professional proposal will appear here..."
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          backgroundColor: 'rgba(103, 126, 234, 0.02)',
                          '& fieldset': { borderColor: 'rgba(103, 126, 234, 0.3)' },
                        },
                        '& .MuiInputBase-input': {
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          lineHeight: 1.6
                        }
                      }}
                    />

                    <Divider sx={{ my: 2 }} />

                    {/* Bid Upgrades */}
                    <Box>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>
                        🎯 Bid Upgrades
                      </Typography>
                      <Stack spacing={1.5}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={upgrades.sealed}
                              onChange={(e) => setUpgrades(prev => ({ ...prev, sealed: e.target.checked }))}
                              sx={{ 
                                '&.Mui-checked': { 
                                  color: '#667eea' 
                                } 
                              }}
                            />
                          }
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Lock sx={{ fontSize: 18, color: '#667eea' }} />
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Sealed Bid (Free)
                              </Typography>
                            </Box>
                          }
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
                          Hide your bid from other freelancers to keep it unique
                        </Typography>

                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={upgrades.sponsored}
                              onChange={(e) => setUpgrades(prev => ({ ...prev, sponsored: e.target.checked }))}
                              sx={{ 
                                '&.Mui-checked': { 
                                  color: '#f39c12' 
                                } 
                              }}
                            />
                          }
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Star sx={{ fontSize: 18, color: '#f39c12' }} />
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Sponsored Bid
                              </Typography>
                            </Box>
                          }
                        />

                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={upgrades.highlight}
                              onChange={(e) => setUpgrades(prev => ({ ...prev, highlight: e.target.checked }))}
                              sx={{ 
                                '&.Mui-checked': { 
                                  color: '#e74c3c' 
                                } 
                              }}
                            />
                          }
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Highlight sx={{ fontSize: 18, color: '#e74c3c' }} />
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Highlight Bid
                              </Typography>
                            </Box>
                          }
                        />
                      </Stack>

                      <Divider sx={{ my: 2 }} />

                      {/* Auto Submit Option */}
                      <FormControlLabel
                        control={
                          <Switch
                            checked={autoSubmit}
                            onChange={(e) => setAutoSubmit(e.target.checked)}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: '#48bb78',
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: '#48bb78',
                              },
                            }}
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <RocketLaunch sx={{ fontSize: 18, color: '#48bb78' }} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              Auto-Submit Bid
                            </Typography>
                          </Box>
                        }
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 4, display: 'block' }}>
                        Automatically place the bid after inserting (1 second delay)
                      </Typography>
                    </Box>

                    {/* Action Buttons */}
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="outlined"
                        onClick={onCopy}
                        disabled={disableCopy}
                        startIcon={<ContentCopy />}
                        sx={{ 
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          borderColor: 'primary.main',
                          color: 'primary.main',
                          '&:hover': {
                            borderColor: 'primary.dark',
                            backgroundColor: 'primary.50'
                          }
                        }}
                      >
                        Copy
                      </Button>
                      <Button
                        variant="contained"
                        onClick={onInsert}
                        disabled={disableInsert}
                        startIcon={isInserting ? <CircularProgress size={16} color="inherit" /> : (autoSubmit ? <RocketLaunch /> : <Send />)}
                        fullWidth
                        sx={{ 
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 700,
                          background: autoSubmit 
                            ? 'linear-gradient(45deg, #e74c3c 30%, #c0392b 90%)'
                            : 'linear-gradient(45deg, #48bb78 30%, #38a169 90%)',
                          '&:hover': {
                            background: autoSubmit
                              ? 'linear-gradient(45deg, #c0392b 30%, #a93226 90%)'
                              : 'linear-gradient(45deg, #38a169 30%, #2f855a 90%)',
                            transform: 'translateY(-1px)',
                            boxShadow: autoSubmit
                              ? '0 4px 15px rgba(231, 76, 60, 0.4)'
                              : '0 4px 15px rgba(72, 187, 120, 0.4)'
                          },
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {isInserting 
                          ? (autoSubmit ? 'Submitting...' : 'Inserting...') 
                          : (autoSubmit ? '🚀 Submit Bid Automatically' : '📝 Insert into Form')
                        }
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Slide>
          )}

          {/* Questions Section */}
          <Slide in direction="up" timeout={1000}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.95)', 
              backdropFilter: 'blur(20px)',
              borderRadius: 2,
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  fontWeight: 700,
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  ❓ Smart Questions
                </Typography>
                
                <Stack spacing={2}>
                  <TextField
                    multiline
                    rows={4}
                    fullWidth
                    value={questions}
                    InputProps={{ readOnly: true }}
                    placeholder="AI-generated clarifying questions will appear here..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: 'rgba(103, 126, 234, 0.02)',
                        '& fieldset': { borderColor: 'rgba(103, 126, 234, 0.3)' },
                      },
                      '& .MuiInputBase-input': {
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        lineHeight: 1.6
                      }
                    }}
                  />
                  
                  <Button
                    variant="outlined"
                    onClick={onGenerateQuestions}
                    disabled={isGeneratingQuestions}
                    startIcon={isGeneratingQuestions ? <CircularProgress size={16} color="inherit" /> : <HelpOutline />}
                    fullWidth
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      py: 1.5,
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      '&:hover': {
                        borderColor: 'primary.dark',
                        backgroundColor: 'primary.50',
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {isGeneratingQuestions ? 'Generating...' : '💡 Generate Smart Questions'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Slide>

          {/* Footer */}
          <Fade in timeout={1200}>
            <Stack spacing={2} sx={{ textAlign: 'center' }}>
              <Button
                variant="text"
                size="small"
                onClick={optionsOnClick}
                startIcon={<Settings />}
                sx={{ 
                  textTransform: 'none',
                  color: 'white',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 2
                  }
                }}
              >
                ⚙️ Configure API Keys
              </Button>
              
              <Typography variant="caption" sx={{ 
                color: 'rgba(255, 255, 255, 0.8)',
                fontWeight: 500,
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
              }}>
                💡 Tip: Cmd/Ctrl + G to generate • Cmd/Ctrl + C to copy • Enter to insert
              </Typography>
            </Stack>
          </Fade>
        </Stack>
      </Container>
    </Box>
  );
}



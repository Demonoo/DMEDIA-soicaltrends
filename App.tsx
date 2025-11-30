import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TrendItem, GlobalAnalysis, BigEvent, ViewState } from './types';
import { fetchTrends, getApiKey, setApiKey, analyzeGlobalTrends, identifyBigEvents } from './services/gemini';
import TrendList from './components/TrendList';
import AnalysisModal from './components/AnalysisModal';
import { Settings, RefreshCw, Search, Key, CheckCircle2, AlertCircle, Sparkles, BarChart3, LineChart, Sun, Moon, Image as ImageIcon, Trash2, Upload, LayoutGrid, Clock, ChevronDown, BrainCircuit, Activity, Zap, Lightbulb, Coins, Film, Tag, Loader2, AlertTriangle, CalendarClock, ExternalLink, ShieldCheck } from 'lucide-react';

export type SortField = 'rank' | 'heatRise' | 'hotValue';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export default function App() {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrend, setSelectedTrend] = useState<TrendItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'douyin' | 'weibo' | 'xhs'>('douyin');
  
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'rank', direction: 'asc' });
  
  // Settings / API Key State
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [showKeyUpdatePrompt, setShowKeyUpdatePrompt] = useState(false);

  // Global Analysis State
  const [globalAnalysis, setGlobalAnalysis] = useState<GlobalAnalysis | null>(null);
  const [bigEvents, setBigEvents] = useState<BigEvent[]>([]);
  const [analyzingGlobal, setAnalyzingGlobal] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [tokenUsage, setTokenUsage] = useState<number>(0);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Background Settings
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState<number>(0.3);

  // Initialize Theme and Settings
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      document.documentElement.classList.add('dark');
    }

    const existingKey = getApiKey();
    if (existingKey) {
        setHasKey(true);
        setApiKeyInput(existingKey);
    }

    const savedBg = localStorage.getItem('bg_image');
    const savedOpacity = localStorage.getItem('bg_opacity');
    if (savedBg) setBgImage(savedBg);
    if (savedOpacity) setBgOpacity(parseFloat(savedOpacity));

    loadTrends(true);
  }, []);

  // Auto-refresh timer (10 minutes)
  useEffect(() => {
    const timer = setInterval(() => {
      loadTrends(false); 
    }, 10 * 60 * 1000); 

    return () => clearInterval(timer);
  }, []);

  // Cleanup progress interval
  useEffect(() => {
    return () => {
        if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const loadTrends = async (showSkeleton = true) => {
    if (refreshing) return;
    setRefreshing(true);
    if (showSkeleton) setLoading(true);
    
    try {
        const data = await fetchTrends();
        setTrends(data);
    } catch (e) {
        console.error("Failed to load trends", e);
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
  };

  const handleSaveKey = () => {
      setApiKey(apiKeyInput);
      setHasKey(!!apiKeyInput);
      setShowSettings(false);
      setShowKeyUpdatePrompt(true); 
  };

  const startAnalysisProgress = () => {
      setAnalysisProgress(0);
      if (progressInterval.current) clearInterval(progressInterval.current);
      
      progressInterval.current = setInterval(() => {
          setAnalysisProgress(prev => {
              if (prev >= 95) {
                  return 95; // Hold at 95% until complete
              }
              // Fast at first, then slower
              const increment = prev < 30 ? 5 : prev < 60 ? 2 : 0.5;
              return Math.min(prev + increment, 95);
          });
      }, 200);
  };

  const getProgressLabel = (p: number) => {
      if (p < 20) return "正在聚合 Top 50 实时热点数据...";
      if (p < 40) return "DeepSeek 正在构建情感倾向模型...";
      if (p < 60) return "正在归类核心创作领域...";
      if (p < 80) return "正在匹配最佳内容形态...";
      return "正在生成生命周期预测报告...";
  };

  const handleRunGlobalAnalysis = async () => {
      if (!trends.length) return;
      setAnalyzingGlobal(true);
      setGlobalAnalysis(null);
      setBigEvents([]);
      setShowKeyUpdatePrompt(false);
      startAnalysisProgress();

      try {
          // Run both Global Analysis and Big Event Detection
          const [analysisResult, eventsResult] = await Promise.all([
            analyzeGlobalTrends(trends),
            identifyBigEvents(trends)
          ]);
          
          // Complete progress
          setAnalysisProgress(100);
          setTimeout(() => {
            setGlobalAnalysis(analysisResult.data);
            setBigEvents(eventsResult.data.events || []);
            setTokenUsage((analysisResult.usage?.total_tokens || 0) + (eventsResult.usage?.total_tokens || 0));
            setAnalyzingGlobal(false);
            if (progressInterval.current) clearInterval(progressInterval.current);
          }, 600); // Small delay to show 100%

      } catch (e) {
          console.error("Global analysis failed", e);
          alert("分析失败，请检查 API Key 或网络连接");
          setAnalyzingGlobal(false);
          if (progressInterval.current) clearInterval(progressInterval.current);
      }
  };

  const handleSort = (field: SortField) => {
    setSortConfig(current => ({
      field,
      direction: current.field === field && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (base64String.length > 3000000) {
            alert("图片过大，请使用小于 2MB 的图片");
            return;
        }
        setBgImage(base64String);
        localStorage.setItem('bg_image', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setBgOpacity(val);
      localStorage.setItem('bg_opacity', val.toString());
  };

  const handleRemoveBg = () => {
      setBgImage(null);
      localStorage.removeItem('bg_image');
  };

  const processedTrends = useMemo(() => {
    let result = trends.filter(trend => {
        const matchesSearch = trend.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    result.sort((a, b) => {
        let valA = 0;
        let valB = 0;

        switch (sortConfig.field) {
            case 'heatRise':
                valA = a.heatRise || 0;
                valB = b.heatRise || 0;
                break;
            case 'hotValue':
                valA = a.hotValue;
                valB = b.hotValue;
                break;
            case 'rank':
            default:
                valA = a.rank;
                valB = b.rank;
                break;
        }

        if (sortConfig.field === 'rank') {
             return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        } else {
             return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
    });

    return result;
  }, [trends, searchQuery, sortConfig]);

  return (
    <div className="min-h-screen relative bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-200 font-sans selection:bg-[#3B82F6] selection:text-white pb-10 transition-colors duration-300 overflow-x-hidden">
      
      {bgImage && (
        <div 
            className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat transition-opacity duration-300"
            style={{ 
                backgroundImage: `url(${bgImage})`,
                opacity: bgOpacity
            }}
        />
      )}

      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 w-full bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             {/* Logo */}
             <div className="flex flex-col items-start leading-none select-none cursor-pointer">
                <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-widest transition-colors">DMEDIA</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-light text-slate-900 dark:text-white tracking-[0.2em] opacity-90 transition-colors">AI</span>
                  <div className="flex flex-col justify-between h-[12px] w-[18px]">
                     <div className="w-full h-[2px] bg-slate-900 dark:bg-white transition-colors"></div>
                     <div className="w-full h-[2px] bg-slate-900/60 dark:bg-white/60 transition-colors"></div>
                     <div className="w-full h-[2px] bg-slate-900/30 dark:bg-white/30 transition-colors"></div>
                  </div>
                </div>
             </div>

             {/* Slogan */}
             <div className="hidden md:block h-8 w-px bg-slate-200 dark:bg-white/10 mx-2"></div>
             <span className="hidden md:block text-[10px] font-bold tracking-[0.3em] text-slate-400 dark:text-slate-500 uppercase select-none">
                GO VIRAL OR GO HOME
             </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              title={theme === 'dark' ? "切换到亮色模式" : "切换到暗色模式"}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button 
              onClick={() => setShowSettings(true)}
              className={`p-2 rounded-full transition-colors flex items-center gap-2 text-sm font-medium
                ${hasKey 
                  ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800' 
                  : 'text-[#FE2C55] bg-[#FE2C55]/10 hover:bg-[#FE2C55]/20'}`}
            >
              {hasKey ? <Settings className="w-5 h-5" /> : <><AlertCircle className="w-4 h-4" /> <span>配置 API</span></>}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-white/5 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors">
                社交媒体趋势
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[#3B82F6] text-white self-start mt-2">
                    AI QUANT
                </span>
            </div>
            
            <p className="text-lg text-slate-500 dark:text-slate-400 font-light flex items-center gap-2 transition-colors">
               一个数据驱动的AI量化营销研究平台
            </p>
          </div>

          <div className="flex flex-col items-end gap-4 w-full md:w-auto">
             <div className="flex flex-col gap-3 w-full md:w-80">
                <div className="relative group w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-[#3B82F6] transition-colors">
                        <Search className="w-4 h-4" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="搜索趋势..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/80 dark:bg-slate-900/50 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition-all"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <select 
                            value={selectedPlatform}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'douyin') setSelectedPlatform('douyin');
                            }}
                            className="appearance-none bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-full pl-3 pr-8 py-1 text-[11px] font-medium text-slate-900 dark:text-slate-400 hover:border-slate-300 dark:hover:bg-slate-700 dark:hover:text-white focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition-all cursor-pointer disabled:cursor-not-allowed w-24"
                        >
                            <option value="douyin">抖音</option>
                            <option value="weibo" disabled>微博</option>
                            <option value="xhs" disabled>小红书</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                    </div>
                </div>
             </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Trend List */}
          <div className="lg:col-span-2 space-y-4">
             <div className="flex items-center justify-between mb-2">
                <h3 className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-2">
                    <LineChart className="w-4 h-4 text-[#3B82F6]" />
                    实时榜单
                </h3>
                
                <div className="flex items-center gap-3">
                     <button 
                        onClick={() => loadTrends(false)}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-slate-500 hover:text-[#3B82F6] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 text-xs"
                        title="立即更新"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        <span>更新</span>
                    </button>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700/50">
                        <Clock className="w-3 h-3" />
                        <span>每10分钟自动更新</span>
                    </div>
                </div>
             </div>
            <TrendList 
              trends={processedTrends} 
              onSelectTrend={setSelectedTrend}
              loading={loading}
              sortConfig={sortConfig}
              onSort={handleSort}
            />
          </div>

          {/* Right Column: Visualization & Analysis - REPLACED WHEN KEY EXISTS */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* 1. PROGRESS STATE */}
            {analyzingGlobal && (
                 <div className="bg-white/90 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 backdrop-blur-sm shadow-sm flex flex-col items-center justify-center min-h-[400px]">
                    <div className="relative w-24 h-24 mb-6">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <path className="text-slate-100 dark:text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                            <path className="text-[#3B82F6] transition-all duration-300 ease-out" strokeDasharray={`${analysisProgress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                             <BrainCircuit className="w-8 h-8 text-[#3B82F6] animate-pulse" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mb-2 font-mono">
                        {Math.round(analysisProgress)}%
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 animate-pulse text-center">
                        {getProgressLabel(analysisProgress)}
                    </div>
                 </div>
            )}

            {/* 2. RESULT STATE (Gene Map) */}
            {!analyzingGlobal && globalAnalysis && (
                <div className="space-y-4">
                     {/* Header Card */}
                     <div className="bg-white/90 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 backdrop-blur-sm shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-4">
                             <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-[#3B82F6]" />
                                热点基因总览
                             </h3>
                             <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs">
                                <span className="text-slate-500">活跃度</span>
                                <span className="font-bold text-[#FE2C55]">{globalAnalysis.viralityScore}</span>
                             </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {globalAnalysis.keywords.map((kw, i) => (
                                <span key={i} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs rounded border border-blue-100 dark:border-blue-800/50">
                                    {kw}
                                </span>
                            ))}
                        </div>
                     </div>

                     {/* BIG EVENTS CARD (NEW) */}
                     {bigEvents.length > 0 && (
                        <div className="bg-orange-50/80 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50 rounded-2xl p-5 backdrop-blur-sm shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards" style={{ animationDelay: '100ms' }}>
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                                <h3 className="font-bold text-slate-900 dark:text-white">长周期大事件 (72h+)</h3>
                            </div>
                            <div className="space-y-3">
                                {bigEvents.map((event, idx) => (
                                    <div key={idx} className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-orange-200 dark:border-orange-900/30">
                                        <div className="flex justify-between items-start gap-2 mb-1">
                                            <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-tight">{event.title}</div>
                                            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                                                {event.durationLabel}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{event.reason}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                     )}

                     {/* Staggered Dimension Cards */}
                     
                     {/* Sentiment */}
                     <div className="bg-white/90 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:border-[#F59E0B] transition-colors group animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards" style={{ animationDelay: '200ms' }}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                <BrainCircuit className="w-3 h-3" /> 情感倾向
                            </span>
                            <span className="text-xs font-bold text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded">
                                {globalAnalysis.sentiment.label}
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {globalAnalysis.sentiment.analysis}
                        </p>
                     </div>

                     {/* Domain */}
                     <div className="bg-white/90 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:border-[#8B5CF6] transition-colors group animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards" style={{ animationDelay: '300ms' }}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                <Tag className="w-3 h-3" /> 创作领域
                            </span>
                            <span className="text-xs font-bold text-[#8B5CF6] bg-[#8B5CF6]/10 px-2 py-0.5 rounded">
                                {globalAnalysis.domain.label}
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {globalAnalysis.domain.analysis}
                        </p>
                     </div>

                     {/* Content Form */}
                     <div className="bg-white/90 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:border-[#EC4899] transition-colors group animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards" style={{ animationDelay: '400ms' }}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                <Film className="w-3 h-3" /> 内容形态
                            </span>
                            <span className="text-xs font-bold text-[#EC4899] bg-[#EC4899]/10 px-2 py-0.5 rounded">
                                {globalAnalysis.contentForm.label}
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {globalAnalysis.contentForm.analysis}
                        </p>
                     </div>

                     {/* Lifecycle */}
                     <div className="bg-white/90 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:border-[#10B981] transition-colors group animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards" style={{ animationDelay: '500ms' }}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                <Clock className="w-3 h-3" /> 生命周期
                            </span>
                            <span className="text-xs font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded">
                                {globalAnalysis.lifecycle.label}
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {globalAnalysis.lifecycle.analysis}
                        </p>
                     </div>

                     {/* Footer */}
                     <div className="flex items-center justify-between px-2 pt-2 animate-in fade-in duration-700" style={{ animationDelay: '600ms' }}>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <Coins className="w-3 h-3" />
                            <span>本次消耗: {tokenUsage} tokens</span>
                        </div>
                        <button 
                            onClick={handleRunGlobalAnalysis}
                            className="text-xs text-[#3B82F6] hover:text-blue-500 flex items-center gap-1 font-medium"
                        >
                            <RefreshCw className="w-3 h-3" />
                            重新生成
                        </button>
                     </div>
                </div>
            )}

            {/* 3. DEFAULT/EMPTY STATE */}
            {!analyzingGlobal && !globalAnalysis && (
                <>
                    {!hasKey ? (
                        <div className="bg-blue-50/50 dark:bg-transparent border border-blue-100 dark:border-[#3B82F6]/20 dark:bg-gradient-to-br dark:from-[#3B82F6]/10 dark:to-transparent rounded-2xl p-6 transition-colors backdrop-blur-sm">
                            <div className="flex items-start gap-3">
                                <Sparkles className="w-5 h-5 text-[#3B82F6] shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">接入 DeepSeek 开启全平台图谱</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                                        配置 API Key 后，AI 将实时分析全榜单情感倾向、流量洼地及运营策略。
                                    </p>
                                    <button 
                                        onClick={() => setShowSettings(true)}
                                        className="text-xs font-bold text-white bg-[#3B82F6] px-4 py-2 rounded-full hover:bg-blue-600 transition-colors"
                                    >
                                        立即配置
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center">
                            <BrainCircuit className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                            <h4 className="font-semibold text-slate-900 dark:text-white mb-2">全平台热点基因图谱</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                点击下方按钮，让 DeepSeek 深度分析当前 Top 50 热点，生成宏观市场报告。
                            </p>
                            <button 
                                onClick={handleRunGlobalAnalysis}
                                disabled={analyzingGlobal}
                                className="w-full py-2.5 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Zap className="w-4 h-4" />
                                生成热点基因图谱
                            </button>
                        </div>
                    )}
                </>
            )}

          </div>
        </div>
      </main>

      {/* API Key Update Prompt Modal */}
      {showKeyUpdatePrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-[#3B82F6]">
                        <BrainCircuit className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">是否更新热点基因图谱？</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            检测到 API Key 已配置。DeepSeek 可以立即分析当前 Top 50 热点，为您生成宏观市场报告。
                        </p>
                    </div>
                    <div className="flex gap-3 w-full mt-2">
                        <button 
                            onClick={() => setShowKeyUpdatePrompt(false)}
                            className="flex-1 py-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 font-medium text-sm transition-colors"
                        >
                            稍后
                        </button>
                        <button 
                            onClick={handleRunGlobalAnalysis}
                            className="flex-1 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold rounded-lg text-sm transition-colors"
                        >
                            立即分析
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 dark:bg-slate-950/80 backdrop-blur-sm transition-colors">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl transition-colors max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Settings className="w-5 h-5 text-[#3B82F6]" />
                        设置
                    </h3>
                    <button 
                        onClick={() => setShowSettings(false)}
                        className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                        关闭
                    </button>
                </div>
                
                <div className="space-y-6">
                    {/* API Key Section */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">DeepSeek API Key</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <input 
                                type="password" 
                                value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                                placeholder="sk-..."
                                className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-white focus:border-[#3B82F6] focus:outline-none transition-colors"
                            />
                        </div>
                        
                        {/* UPDATED API KEY INFO SECTION */}
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30 text-xs">
                            <div className="flex items-start gap-2 mb-2">
                                <ShieldCheck className="w-4 h-4 text-[#3B82F6] shrink-0 mt-0.5" />
                                <span className="text-slate-600 dark:text-slate-300">
                                    <strong className="text-slate-900 dark:text-white">安全提示：</strong>
                                    您的密钥仅存储在本地浏览器 (LocalStorage)，绝不会上传至服务器。
                                </span>
                            </div>
                            <div className="flex items-start gap-2">
                                <ExternalLink className="w-4 h-4 text-[#3B82F6] shrink-0 mt-0.5" />
                                <span className="text-slate-600 dark:text-slate-300">
                                    <strong className="text-slate-900 dark:text-white">获取密钥：</strong>
                                    前往 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="text-[#3B82F6] hover:underline hover:text-blue-600 font-medium">DeepSeek 开放平台</a> 申请。
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="w-full h-px bg-slate-200 dark:bg-slate-800"></div>

                    {/* Background Settings Section */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-3">自定义背景</label>
                        
                        {!bgImage ? (
                            <div className="relative group">
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:border-[#3B82F6] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <Upload className="w-8 h-8 mb-2 text-[#3B82F6]" />
                                    <span className="text-sm">点击或拖拽上传图片</span>
                                    <span className="text-xs mt-1 text-slate-400">支持 JPG, PNG (最大 3MB)</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 h-32 group">
                                    <img src={bgImage} alt="Background Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button 
                                            onClick={handleRemoveBg}
                                            className="px-4 py-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg flex items-center gap-2 text-sm backdrop-blur-sm transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            移除背景
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-600 dark:text-slate-300">背景透明度</span>
                                        <span className="text-slate-900 dark:text-white font-mono">{Math.round(bgOpacity * 100)}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="1" 
                                        step="0.05"
                                        value={bgOpacity}
                                        onChange={handleOpacityChange}
                                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#3B82F6]"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button 
                            onClick={handleSaveKey}
                            className="w-full py-2.5 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            保存所有设置
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Analysis Modal */}
      {selectedTrend && (
        <AnalysisModal 
          trend={selectedTrend} 
          onClose={() => setSelectedTrend(null)} 
          onOpenSettings={() => {
              setSelectedTrend(null);
              setShowSettings(true);
          }}
        />
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { TrendItem, TrendAnalysis } from '../types';
import { analyzeTrendWithAI } from '../services/gemini';
import { X, Key, Loader2, Zap, Tag, Film, Clock, Hash, Activity } from 'lucide-react';

interface AnalysisModalProps {
  trend: TrendItem | null;
  onClose: () => void;
  onOpenSettings: () => void;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ trend, onClose, onOpenSettings }) => {
  const [analysis, setAnalysis] = useState<TrendAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (trend) {
      const cacheKey = `analysis_cache_${trend.title}`;
      const cachedData = localStorage.getItem(cacheKey);

      setLoading(true);
      setAnalysis(null);
      setError(null);

      // 1. Try Cache
      if (cachedData) {
        try {
            const parsed = JSON.parse(cachedData);
            setAnalysis(parsed);
            setLoading(false);
            return;
        } catch (e) {
            localStorage.removeItem(cacheKey); // Clear invalid cache
        }
      }

      // 2. Fetch API if no cache
      analyzeTrendWithAI(trend.title)
        .then((response) => {
            setAnalysis(response.data);
            // Save to cache
            localStorage.setItem(cacheKey, JSON.stringify(response.data));
        })
        .catch((err) => {
           if (err.message === "MISSING_API_KEY") {
               setError("MISSING_KEY");
           } else {
               setError("DeepSeek 目前不可用");
           }
        })
        .finally(() => setLoading(false));
    }
  }, [trend]);

  if (!trend) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 transition-colors">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start bg-white dark:bg-slate-900 transition-colors">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[#3B82F6] text-white">GENE MAP ANALYSIS</span>
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">热点基因图谱</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{trend.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 dark:bg-black/20">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-500">
              <Loader2 className="w-10 h-10 animate-spin text-[#3B82F6]" />
              <p className="animate-pulse">DeepSeek 正在解析热点基因...</p>
            </div>
          ) : error === "MISSING_KEY" ? (
             <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center transition-colors">
                    <Key className="w-8 h-8 text-[#3B82F6]" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">需要 API Key</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                        要使用 AI 基因图谱分析功能，请先配置 DeepSeek API Key。
                    </p>
                    <button 
                        onClick={() => { onClose(); onOpenSettings(); }}
                        className="px-6 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold rounded-full transition-colors"
                    >
                        配置 API Key
                    </button>
                </div>
             </div>
          ) : analysis ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Col: Virality Score */}
              <div className="md:col-span-4 lg:col-span-3 space-y-4">
                 <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-widest mb-4">病毒传播指数</span>
                    <div className="relative flex items-center justify-center w-32 h-32 mb-2">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <path
                            className="text-slate-100 dark:text-slate-700 transition-colors"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            />
                            <path
                            className="text-[#FE2C55]"
                            strokeDasharray={`${analysis.viralityScore}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-3xl font-bold text-slate-900 dark:text-white">{analysis.viralityScore}</span>
                        </div>
                    </div>
                 </div>

                 <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-white font-semibold">
                        <Hash className="w-4 h-4 text-[#3B82F6]" />
                        <span>核心话题词</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {analysis.keywords.map((kw, i) => (
                            <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-lg">
                                {kw}
                            </span>
                        ))}
                    </div>
                 </div>
              </div>

              {/* Right Col: 4 Dimensions Grid */}
              <div className="md:col-span-8 lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-4">
                 
                 {/* Dimension 1: Sentiment */}
                 <div className="bg-white dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-300 dark:hover:border-blue-700/50 transition-colors group">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-[#F59E0B]">
                            <Activity className="w-5 h-5" />
                            <span className="text-sm font-bold uppercase tracking-wide">情感倾向</span>
                        </div>
                        <span className="px-2 py-0.5 bg-[#F59E0B]/10 text-[#F59E0B] text-xs font-bold rounded">{analysis.sentiment.label}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        {analysis.sentiment.analysis}
                    </p>
                 </div>

                 {/* Dimension 2: Domain */}
                 <div className="bg-white dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-300 dark:hover:border-blue-700/50 transition-colors group">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-[#8B5CF6]">
                            <Tag className="w-5 h-5" />
                            <span className="text-sm font-bold uppercase tracking-wide">创作领域</span>
                        </div>
                        <span className="px-2 py-0.5 bg-[#8B5CF6]/10 text-[#8B5CF6] text-xs font-bold rounded">{analysis.domain.label}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        {analysis.domain.analysis}
                    </p>
                 </div>

                 {/* Dimension 3: Content Form */}
                 <div className="bg-white dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-300 dark:hover:border-blue-700/50 transition-colors group">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-[#EC4899]">
                            <Film className="w-5 h-5" />
                            <span className="text-sm font-bold uppercase tracking-wide">内容形态匹配</span>
                        </div>
                        <span className="px-2 py-0.5 bg-[#EC4899]/10 text-[#EC4899] text-xs font-bold rounded">{analysis.contentForm.label}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        {analysis.contentForm.analysis}
                    </p>
                 </div>

                 {/* Dimension 4: Lifecycle */}
                 <div className="bg-white dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-300 dark:hover:border-blue-700/50 transition-colors group">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-[#10B981]">
                            <Clock className="w-5 h-5" />
                            <span className="text-sm font-bold uppercase tracking-wide">生命周期预测</span>
                        </div>
                        <span className="px-2 py-0.5 bg-[#10B981]/10 text-[#10B981] text-xs font-bold rounded">{analysis.lifecycle.label}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        {analysis.lifecycle.analysis}
                    </p>
                 </div>

              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;

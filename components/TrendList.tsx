import React, { useMemo } from 'react';
import { TrendItem } from '../types';
import { Flame, Zap, TrendingUp, ArrowUpRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { SortConfig, SortField } from '../App';

interface TrendListProps {
  trends: TrendItem[];
  onSelectTrend: (trend: TrendItem) => void;
  loading: boolean;
  sortConfig: SortConfig;
  onSort: (field: SortField) => void;
}

const TrendList: React.FC<TrendListProps> = ({ trends, onSelectTrend, loading, sortConfig, onSort }) => {
  // Calculate Rise Rankings
  const riseRankings = useMemo(() => {
    const sortedByRise = [...trends].sort((a, b) => (b.heatRise || 0) - (a.heatRise || 0));
    const rankMap = new Map<string, number>();
    sortedByRise.forEach((item, index) => {
      rankMap.set(item.title, index + 1);
    });
    return rankMap;
  }, [trends]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-200 dark:bg-slate-800/50 rounded-lg w-full"></div>
        ))}
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num > 10000) return `${(num / 10000).toFixed(1)}w`;
    return num.toString();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
      if (sortConfig.field !== field) return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
      return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#3B82F6]" /> : <ArrowDown className="w-3 h-3 text-[#3B82F6]" />;
  };

  return (
    <div className="flex flex-col gap-2 pb-20">
      {/* Table Header - Clickable for sorting */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
        <div 
            className="col-span-1 text-center cursor-pointer group flex items-center justify-center gap-1 hover:text-slate-900 dark:hover:text-white"
            onClick={() => onSort('rank')}
        >
            排名 <SortIcon field="rank" />
        </div>
        <div className="col-span-5 pl-2">话题</div>
        <div 
            className="col-span-3 text-right cursor-pointer group flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-white"
            onClick={() => onSort('heatRise')}
        >
            <SortIcon field="heatRise" /> 
            <span className="hidden sm:inline">10min </span>飙升
        </div>
        <div 
            className="col-span-2 text-right cursor-pointer group flex items-center justify-end gap-1 hover:text-slate-900 dark:hover:text-white"
            onClick={() => onSort('hotValue')}
        >
             <SortIcon field="hotValue" /> 
             <span className="hidden sm:inline">总</span>热度
        </div>
        <div className="col-span-1 text-center hidden sm:block">分析</div>
        <div className="col-span-1 text-center sm:hidden"></div>
      </div>
      
      {trends.map((trend) => {
        const riseRank = riseRankings.get(trend.title) || 0;
        
        return (
          <div 
            key={trend.rank}
            onClick={() => onSelectTrend(trend)}
            className="group grid grid-cols-12 gap-2 items-center p-4 rounded-xl border transition-all duration-200 cursor-pointer relative overflow-hidden
                       bg-white border-slate-200 hover:bg-slate-50 hover:border-blue-300 hover:shadow-lg hover:z-10
                       dark:bg-slate-900/40 dark:border-slate-700 dark:hover:bg-slate-900 dark:hover:border-slate-300 dark:hover:scale-[1.01] dark:hover:shadow-xl"
          >
            {/* Rank Badge */}
            <div className="col-span-1 flex justify-center">
              <div className={`w-6 h-6 flex items-center justify-center rounded-lg font-bold text-xs font-sans transition-transform group-hover:scale-110
                ${trend.rank === 1 ? 'bg-[#FE2C55] text-white shadow-[0_0_10px_rgba(254,44,85,0.4)]' : 
                  trend.rank === 2 ? 'bg-[#ff7e5f] text-white' : 
                  trend.rank === 3 ? 'bg-[#feb47b] text-white' : 'text-slate-500 bg-slate-100 dark:bg-slate-800/50 dark:group-hover:bg-slate-700 dark:group-hover:text-white'}`}>
                {trend.rank}
              </div>
            </div>

            {/* Title & Description */}
            <div className="col-span-5 flex flex-col justify-center pr-2">
              <span className="font-medium text-slate-800 dark:text-slate-200 text-sm md:text-base break-words group-hover:text-blue-600 dark:group-hover:text-white transition-colors">
                {trend.title}
              </span>
              {trend.description && (
                <span className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 group-hover:text-slate-600 dark:group-hover:text-slate-400">
                    {trend.description}
                </span>
              )}
            </div>

            {/* 10-Min Heat Rise Column - MATCH RANK 1 COLOR (#FE2C55) */}
            <div className="col-span-3 flex items-center justify-end gap-2">
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 text-[#FE2C55] font-bold text-sm font-mono whitespace-nowrap">
                         <TrendingUp className="w-3 h-3" />
                         +{formatNumber(trend.heatRise || 0)}
                    </div>
                    {/* Rise Rank Badge - Gray Style - Hidden on Mobile */}
                    <div className="hidden sm:flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md mt-0.5 font-medium
                        bg-slate-100 text-slate-500 border border-slate-200
                        dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                        <ArrowUpRight className="w-2.5 h-2.5" />
                        <span>飙升榜 #{riseRank}</span>
                    </div>
                </div>
            </div>

            {/* Total Hot Value */}
            <div className="col-span-2 flex items-center justify-end gap-1 text-slate-600 dark:text-slate-400 font-mono text-xs md:text-sm dark:group-hover:text-slate-200 whitespace-nowrap">
              {formatNumber(trend.hotValue)}
              <Flame className={`w-3 h-3 ${trend.hotValue > 10000000 ? 'text-[#FE2C55]' : 'text-slate-400 dark:text-slate-700 dark:group-hover:text-slate-500'}`} />
            </div>

            {/* Action */}
            <div className="col-span-1 flex justify-center">
              <button className="p-1.5 rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500 group-hover:bg-[#3B82F6] group-hover:text-white transition-colors hidden sm:block">
                <Zap className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {/* Subtle Progress Bar background indicating hotness relative to max */}
            <div 
              className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#3B82F6] to-[#FE2C55] opacity-20 group-hover:opacity-50 transition-opacity"
              style={{ width: `${(trend.hotValue / 20000000) * 100}%` }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default TrendList;
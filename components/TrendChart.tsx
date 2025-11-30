import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendItem } from '../types';

interface TrendChartProps {
  data: TrendItem[];
  theme?: 'dark' | 'light';
}

const TrendChart: React.FC<TrendChartProps> = ({ data, theme = 'dark' }) => {
  // Aggregate data by category
  const categoryData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + item.hotValue;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [data]);

  const COLORS = ['#FE2C55', '#3B82F6', '#FACC15', '#10B981', '#8B5CF6', '#F97316'];

  const isDark = theme === 'dark';

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={categoryData}>
          <XAxis 
            dataKey="name" 
            tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} 
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip 
            formatter={(value: number) => [value, '热度']}
            labelFormatter={(label) => `领域: ${label}`}
            contentStyle={{ 
                backgroundColor: isDark ? '#1e293b' : '#ffffff', 
                borderColor: isDark ? '#334155' : '#e2e8f0', 
                color: isDark ? '#f8fafc' : '#0f172a',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
            itemStyle={{ color: isDark ? '#f8fafc' : '#0f172a' }}
            cursor={{ fill: isDark ? '#334155' : '#cbd5e1', opacity: 0.2 }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {categoryData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;
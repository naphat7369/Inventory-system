'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useDrilldownFilter } from '../hooks/useDrilldownFilter';
import { useTheme } from 'next-themes';
import { FilterX } from 'lucide-react';

type ChartData = {
  id: string;
  name: string;
  value: number;
};

export function InteractivePieChart({ 
  data, 
  paramKey,
  title
}: { 
  data: ChartData[], 
  paramKey: string,
  title: string
}) {
  const { activeValues, toggle, clear, isPending } = useDrilldownFilter(paramKey);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';

  const COLORS = [
    '#2563EB', // Blue 600
    '#059669', // Emerald 600
    '#D97706', // Amber 600
    '#7C3AED', // Purple 600
    '#E11D48', // Rose 600
    '#0D9488', // Teal 600
    '#4F46E5', // Indigo 600
    '#C026D3', // Fuchsia 600
    '#0891B2', // Cyan 600
    '#EA580C', // Orange 600
    '#475569', // Slate 600
  ];

  return (
    <div className={`flex flex-col h-full relative transition-opacity duration-300 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display uppercase tracking-widest text-[0.8rem] text-text">{title}</h2>
        {activeValues.length > 0 && (
          <button 
            onClick={clear}
            className="flex items-center gap-1 text-[0.65rem] uppercase tracking-wider text-accent-primary hover:bg-accent-primary/10 px-2 py-1 rounded transition-colors"
          >
            <FilterX size={12} /> Clear Filter
          </button>
        )}
      </div>

      {data.length > 0 ? (
        <div className="flex-1 min-h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
                onClick={(entry: any) => toggle(entry?.id || entry?.name)}
                cursor="pointer"
              >
                {data.map((entry, index) => {
                  const isSelected = activeValues.includes(entry.id || entry.name);
                  const opacity = activeValues.length === 0 || isSelected ? 1 : 0.3;
                  const strokeProps = isSelected 
                    ? { stroke: isDark ? '#FFFFFF' : '#1C1C1A', strokeWidth: 3 } 
                    : { stroke: isDark ? '#0F172A' : '#F8F9F5', strokeWidth: 1.5 };
                  
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      opacity={opacity}
                      {...strokeProps}
                    />
                  );
                })}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: isDark ? '#1E293B' : '#F8F9F5', 
                  borderColor: isDark ? '#475569' : '#D4D6CF',
                  borderRadius: '4px',
                  color: isDark ? '#F8FAFC' : '#1C1C1A',
                  fontFamily: 'var(--font-inter)'
                }} 
                itemStyle={{ color: isDark ? '#F8FAFC' : '#1C1C1A' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ 
                  fontFamily: 'var(--font-inter)', 
                  fontSize: '12px', 
                  color: isDark ? '#94A3B8' : '#1C1C1A' 
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex-1 min-h-[250px] flex items-center justify-center text-text/50 font-mono text-sm border border-dashed border-border">
          [ No data to display ]
        </div>
      )}
    </div>
  );
}

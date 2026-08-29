'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useDrilldownFilter } from '../hooks/useDrilldownFilter';
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
  const { activeValue, toggle, isPending } = useDrilldownFilter(paramKey);

  // Extended palette based on Industrial Warehouse theme
  const COLORS = [
    '#E24A22', // Safety Orange
    '#4C6246', // Utility Green
    '#1C1C1A', // Near Black
    '#D4D6CF', // Steel Gray
    '#F26A42', // Lighter Orange
    '#6B8265', // Lighter Green
    '#4A4A48', // Lighter Black
    '#E8E9E6', // Lighter Gray
  ];

  return (
    <div className={`flex flex-col h-full relative transition-opacity duration-300 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display uppercase tracking-widest text-[0.8rem] text-text">{title}</h2>
        {activeValue && (
          <button 
            onClick={() => toggle(activeValue)}
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
                onClick={(entry) => toggle(entry.id)}
                cursor="pointer"
              >
                {data.map((entry, index) => {
                  // If a filter is active, dim the non-selected slices
                  const isSelected = activeValue === entry.id;
                  const opacity = !activeValue || isSelected ? 1 : 0.3;
                  // Make active slice slightly thicker border
                  const strokeProps = isSelected ? { stroke: '#1C1C1A', strokeWidth: 2 } : { stroke: 'none' };
                  
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
                  backgroundColor: '#F8F9F5', 
                  borderColor: '#D4D6CF',
                  borderRadius: '2px',
                  color: '#1C1C1A',
                  fontFamily: 'var(--font-inter)'
                }} 
                itemStyle={{ color: '#1C1C1A' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontFamily: 'var(--font-inter)', fontSize: '12px', color: '#1C1C1A' }}
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

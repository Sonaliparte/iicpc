import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { ScoreHistory } from '../../types';

interface LatencyChartProps {
  data: ScoreHistory[];
}

export default function LatencyChart({ data }: LatencyChartProps) {
  // Custom dark glass tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="backdrop-blur-md bg-black/90 border border-white/10 rounded-lg p-3 shadow-2xl font-mono text-xs text-white/80 space-y-1">
          <span className="block text-[10px] text-white/40 mb-1 tracking-wider uppercase font-bold">TIMESTAMP: {label}</span>
          <span className="block text-cyber-cyan font-semibold">P50 Latency: {payload[0].value.toFixed(2)} ms</span>
          <span className="block text-cyber-violet font-semibold">P90 Latency: {payload[1].value.toFixed(2)} ms</span>
          <span className="block text-cyber-amber font-semibold">P99 Latency: {payload[2].value.toFixed(2)} ms</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.02)" strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            stroke="rgba(255,255,255,0.2)" 
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.2)" 
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="top" 
            height={36} 
            iconType="circle"
            wrapperStyle={{ fontSize: 10, fontFamily: 'Space Grotesk', textTransform: 'uppercase', letterSpacing: '0.1em' }}
          />
          
          <Line 
            name="p50 (median)"
            type="monotone" 
            dataKey="p50" 
            stroke="#00f5ff" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: '#00f5ff', strokeWidth: 1 }}
            animationDuration={800}
          />
          
          <Line 
            name="p90 (tail)"
            type="monotone" 
            dataKey="p90" 
            stroke="#8b5cf6" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: '#8b5cf6', strokeWidth: 1 }}
            animationDuration={800}
          />
          
          <Line 
            name="p99 (worst)"
            type="monotone" 
            dataKey="p99" 
            stroke="#f59e0b" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: '#f59e0b', strokeWidth: 1 }}
            animationDuration={800}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

interface TpsGaugeProps {
  tps: number;
  peakTps: number;
}

export default function TpsGauge({ tps, peakTps }: TpsGaugeProps) {
  // Cap at 150k TPS for the gauge maximum
  const maxTps = 150000;
  const percentage = (tps / maxTps) * 100;
  
  // Format the Recharts payload
  const chartData = [
    {
      name: 'Background',
      value: maxTps,
      fill: 'rgba(255, 255, 255, 0.02)'
    },
    {
      name: 'Active TPS',
      value: tps,
      fill: '#00f5ff'
    }
  ];

  return (
    <div className="relative w-full h-72 flex items-center justify-center">
      
      {/* Sci-Fi Reactor Core Background Rings */}
      <div className="absolute w-44 h-44 rounded-full border border-cyber-cyan/10 flex items-center justify-center pointer-events-none z-0">
        <div className="w-36 h-36 rounded-full border border-dashed border-cyber-cyan/20 animate-spin-slow flex items-center justify-center">
          <div className="w-28 h-28 rounded-full border border-white/[0.04] bg-space-void/80 shadow-inner" />
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart 
          cx="50%" 
          cy="50%" 
          innerRadius="65%" 
          outerRadius="80%" 
          barSize={6} 
          data={chartData}
          startAngle={225}
          endAngle={-45}
        >
          <RadialBar
            background
            dataKey="value"
            cornerRadius={4}
            animationDuration={600}
          />
        </RadialBarChart>
      </ResponsiveContainer>

      {/* Central Monospace Reactor Display */}
      <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none z-10">
        <span className="text-[10px] font-mono tracking-widest text-white/30 uppercase font-bold">CORE_REACTOR</span>
        
        <span className="text-xl font-mono font-bold mt-1 text-cyber-cyan text-glow-cyan">
          {tps.toLocaleString()}
        </span>
        
        <span className="text-[9px] font-mono tracking-wide text-white/50 mt-0.5">
          PEAK: {(peakTps / 1000).toFixed(1)}k TPS
        </span>
        
        {/* Pulsing nuclear state dot */}
        <span className="flex h-2 w-2 mt-2">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-cyber-cyan opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-cyan"></span>
        </span>
      </div>

    </div>
  );
}

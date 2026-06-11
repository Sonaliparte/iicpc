import { motion } from 'framer-motion';

interface Bot {
  id: number;
  radius: number;
  speed: number;
  size: number;
  color: string;
  persona: 'market_maker' | 'aggressive_taker' | 'cancel_spammer';
}

export default function BotFleetViz() {
  const botCount = Number(import.meta.env.VITE_BOT_COUNT) || 10;

  // Define automated stress-testing bots revolving around the sandbox core
  const allBots: Bot[] = [
    { id: 1, radius: 45, speed: 8, size: 3, color: '#00f5ff', persona: 'market_maker' },
    { id: 2, radius: 45, speed: 12, size: 2.5, color: '#00f5ff', persona: 'market_maker' },
    { id: 3, radius: 65, speed: 15, size: 3.5, color: '#8b5cf6', persona: 'aggressive_taker' },
    { id: 4, radius: 65, speed: 9, size: 2, color: '#00f5ff', persona: 'market_maker' },
    { id: 5, radius: 85, speed: 20, size: 4, color: '#f59e0b', persona: 'cancel_spammer' },
    { id: 6, radius: 85, speed: 14, size: 3, color: '#8b5cf6', persona: 'aggressive_taker' },
    { id: 7, radius: 105, speed: 25, size: 3, color: '#00f5ff', persona: 'market_maker' },
    { id: 8, radius: 105, speed: 18, size: 3.5, color: '#f59e0b', persona: 'cancel_spammer' },
    { id: 9, radius: 125, speed: 32, size: 4, color: '#8b5cf6', persona: 'aggressive_taker' },
    { id: 10, radius: 125, speed: 22, size: 2.5, color: '#00f5ff', persona: 'market_maker' },
    { id: 11, radius: 145, speed: 38, size: 3.5, color: '#f59e0b', persona: 'cancel_spammer' },
    { id: 12, radius: 145, speed: 28, size: 3, color: '#8b5cf6', persona: 'aggressive_taker' },
  ];

  // Slice bots based on environment variable count
  const bots = allBots.slice(0, botCount);

  return (
    <div className="relative w-full h-80 flex items-center justify-center bg-[#020204]/30 rounded-xl overflow-hidden border border-white/[0.02]">
      {/* Bot Count Badge */}
      <div className="absolute top-3 right-4 font-mono text-[9px] text-cyber-cyan border border-cyber-cyan/35 bg-cyber-cyan/10 px-2 py-0.5 rounded">
        BOT_COUNT = {botCount}
      </div>

      {/* Concentric Trajectory Rings Underlay */}
      <svg className="absolute w-full h-full" viewBox="0 0 400 400" fill="none">
        <circle cx="200" cy="200" r="45" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
        <circle cx="200" cy="200" r="65" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
        <circle cx="200" cy="200" r="85" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
        <circle cx="200" cy="200" r="105" stroke="rgba(255,255,255,0.015)" strokeWidth="1" strokeDasharray="2 4" />
        <circle cx="200" cy="200" r="125" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
        <circle cx="200" cy="200" r="145" stroke="rgba(255,255,255,0.015)" strokeWidth="1" strokeDasharray="3 6" />
      </svg>

      {/* Orbiting Bot SVG Canvas */}
      <svg className="w-full h-full max-w-[340px] max-h-[340px] overflow-visible" viewBox="0 0 400 400">
        
        {/* Orbits Container Group */}
        <g transform="translate(0, 0)">
          {bots.map((bot) => (
            <g key={bot.id}>
              {/* Rotating orbital path link */}
              <motion.g
                animate={{ rotate: 360 }}
                transition={{
                  duration: bot.speed,
                  ease: "linear",
                  repeat: Infinity
                }}
                style={{ originX: '200px', originY: '200px' }}
              >
                {/* Orbital particle dot */}
                <circle
                  cx={200 + bot.radius}
                  cy="200"
                  r={bot.size}
                  fill={bot.color}
                  filter={`drop-shadow(0 0 3px ${bot.color})`}
                />
                
                {/* Slow trail effect */}
                <circle
                  cx={200 + bot.radius - 3}
                  cy="200"
                  r={bot.size * 0.7}
                  fill={bot.color}
                  opacity={0.35}
                />
              </motion.g>
            </g>
          ))}
        </g>

        {/* Central Core Contestant Sandbox Orb */}
        <g>
          {/* Outer Blurring Halo Rings */}
          <circle 
            cx="200" 
            cy="200" 
            r="28" 
            fill="url(#sandboxGlow)" 
            opacity="0.15" 
            filter="blur(6px)" 
          />
          <motion.circle 
            animate={{ r: [15, 18, 15] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            cx="200" 
            cy="200" 
            fill="url(#sandboxCore)" 
            stroke="#8b5cf6" 
            strokeWidth="1.5"
            filter="drop-shadow(0 0 10px #8b5cf6)"
          />
        </g>

        {/* SVG Gradients definitions */}
        <defs>
          <radialGradient id="sandboxGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="sandboxCore" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#00f5ff" />
            <stop offset="60%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#0d0720" />
          </radialGradient>
        </defs>
      </svg>

      {/* Visual Legend Tags */}
      <div className="absolute bottom-3 left-4 flex flex-wrap gap-x-3 gap-y-1 text-[8px] font-mono tracking-wider uppercase text-white/50 z-10">
        <div className="flex items-center space-x-1">
          <div className="w-1.5 h-1.5 rounded-full bg-cyber-cyan" />
          <span>Market Maker ({bots.filter(b => b.persona === 'market_maker').length}x)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-1.5 h-1.5 rounded-full bg-cyber-violet" />
          <span>Aggressive Taker ({bots.filter(b => b.persona === 'aggressive_taker').length}x)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-1.5 h-1.5 rounded-full bg-cyber-amber" />
          <span>Cancel Spammer ({bots.filter(b => b.persona === 'cancel_spammer').length}x)</span>
        </div>
      </div>

    </div>
  );
}

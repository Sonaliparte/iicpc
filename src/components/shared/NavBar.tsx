import { Activity, Clock } from 'lucide-react';
import LiveIndicator from '../leaderboard/LiveIndicator';
import { useCountdown } from '../../hooks/useCountdown';
import { ViewType } from '../../App';

interface NavBarProps {
  currentView: ViewType;
  navigateTo: (view: ViewType, param?: string) => void;
}

export default function NavBar({ currentView, navigateTo }: NavBarProps) {
  // Target deadline: June 10, 2026
  const { days, hours, minutes, seconds } = useCountdown('2026-06-10T23:59:59');

  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-white/[0.04] bg-space-void/65 backdrop-blur-md">
      {/* Left Area: Logo & Pulse Indicator */}
      <div className="flex items-center space-x-6">
        <div 
          onClick={() => navigateTo('leaderboard')}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/35 group-hover:border-cyber-cyan transition-all duration-300 shadow-glass-cyan">
            <Activity className="w-5 h-5 text-cyber-cyan animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-display font-bold tracking-wider text-glow-cyan">IICPC 2026</span>
            <span className="text-[10px] font-mono tracking-widest text-white/40 group-hover:text-white/60 transition-colors uppercase">NEXUS_SYSTEM</span>
          </div>
        </div>
        
        {/* Live Indicator */}
        <LiveIndicator />
      </div>

      {/* Center: Mission Control Branding */}
      <div className="hidden md:flex flex-col items-center">
        <h1 className="text-lg font-display font-bold uppercase tracking-widest text-white text-glow-cyan">
          SUMMER HACKATHON
        </h1>
        <span className="text-[10px] font-mono tracking-[0.25em] text-cyber-violet uppercase text-glow-violet">
          STRESS TEST CONTROL CENTER
        </span>
      </div>

      {/* Right Area: Monospace Timer & Team Identity */}
      <div className="flex items-center space-x-6">
        {/* Countdown Timer */}
        <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-full border border-cyber-cyan/10 bg-white/[0.02]">
          <Clock className="w-4 h-4 text-cyber-cyan" />
          <div className="flex items-center space-x-1 font-mono text-xs text-white/80">
            <span className="text-white/40">T-MINUS</span>
            <span className="text-cyber-cyan font-bold text-glow-cyan font-mono">{days}d</span>
            <span className="text-cyber-cyan font-bold text-glow-cyan font-mono">{hours}h</span>
            <span className="text-cyber-cyan font-bold text-glow-cyan font-mono">{minutes}m</span>
            <span className="text-cyber-cyan font-bold text-glow-cyan font-mono">{seconds}s</span>
          </div>
        </div>

        {/* Contestant Team Widget */}
        <div 
          onClick={() => navigateTo('analytics', 'team-4')}
          className="flex items-center space-x-3 pl-4 border-l border-white/[0.08] cursor-pointer group"
        >
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-white group-hover:text-cyber-cyan transition-colors">NullPointers</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan uppercase tracking-wider font-bold">
              CONTESTANT
            </span>
          </div>
          <div className="w-8 h-8 rounded-full border border-cyber-cyan/40 bg-cyber-cyan/10 flex items-center justify-center font-bold text-xs text-cyber-cyan font-display group-hover:shadow-halo-cyan transition-all duration-300">
            N
          </div>
        </div>
      </div>
    </header>
  );
}

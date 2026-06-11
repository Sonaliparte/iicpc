import { motion } from 'framer-motion';
import { Trophy, Upload, LineChart, Settings } from 'lucide-react';
import { ViewType } from '../../App';

interface FloatingSidebarProps {
  currentView: ViewType;
  navigateTo: (view: ViewType, param?: string) => void;
}

export default function FloatingSidebar({ currentView, navigateTo }: FloatingSidebarProps) {
  const navItems = [
    {
      id: 'leaderboard' as ViewType,
      icon: Trophy,
      label: 'Leaderboard',
      glow: 'shadow-glass-cyan'
    },
    {
      id: 'upload' as ViewType,
      icon: Upload,
      label: 'Submit Code',
      glow: 'shadow-glass-cyan'
    },
    {
      id: 'analytics' as ViewType,
      icon: LineChart,
      label: 'Live Metrics',
      glow: 'shadow-glass-cyan'
    }
  ];

  return (
    <aside className="relative z-20 flex flex-col justify-between py-6 px-4 border-r border-white/[0.04] bg-space-void/45 backdrop-blur-md">
      {/* Top Section: Glowing Icon Docks */}
      <div className="flex flex-col space-y-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <div key={item.id} className="relative group">
              <motion.button
                whileHover={{ y: -3, scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigateTo(item.id)}
                className={`
                  relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-300 border
                  ${isActive 
                    ? 'bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-glow-cyan shadow-glass-cyan' 
                    : 'bg-white/[0.02] border-white/[0.08] text-white/40 hover:text-white/80 hover:border-white/20'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                {isActive && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-3 rounded-l bg-cyber-cyan" />
                )}
              </motion.button>
              
              {/* Sleek Sidebar tooltip */}
              <div className="absolute left-16 top-1/2 -translate-y-1/2 scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-black/90 border border-cyber-cyan/30 text-cyber-cyan shadow-glass-cyan backdrop-blur-md whitespace-nowrap">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Section: Settings Icon */}
      <div className="relative group">
        <motion.button
          whileHover={{ y: -2, rotate: 45 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/[0.02] border border-white/[0.08] text-white/40 hover:text-white/80 hover:border-white/20 transition-all duration-300"
        >
          <Settings className="w-5 h-5" />
        </motion.button>
        <div className="absolute left-16 top-1/2 -translate-y-1/2 scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-black/90 border border-white/20 text-white shadow-md backdrop-blur-md whitespace-nowrap">
          SYSTEM SETTINGS
        </div>
      </div>
    </aside>
  );
}

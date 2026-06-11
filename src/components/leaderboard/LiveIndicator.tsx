import { motion } from 'framer-motion';

export default function LiveIndicator() {
  return (
    <div className="flex items-center space-x-3 px-3 py-1.5 rounded-full border border-cyber-crimson/25 bg-cyber-crimson/5 backdrop-blur-sm">
      {/* Outer pulsing ring */}
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-crimson opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyber-crimson"></span>
      </span>
      
      <div className="flex items-center space-x-1.5 text-xs font-mono">
        <span className="text-cyber-crimson font-bold uppercase tracking-wider text-glow-crimson animate-pulse">LIVE</span>
        <span className="text-white/30">|</span>
        <motion.span 
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-white/80 font-bold uppercase font-mono tracking-wide"
        >
          STRESS_TEST_PODS_09
        </motion.span>
      </div>
    </div>
  );
}

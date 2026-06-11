import { motion, AnimatePresence } from 'framer-motion';
import { Terminal } from 'lucide-react';
import { FillEvent } from '../../types';

interface FillLogStreamProps {
  logs: FillEvent[];
}

export default function FillLogStream({ logs }: FillLogStreamProps) {
  // Show only latest 16 logs in the viewport
  const visibleLogs = logs.slice(0, 16);

  return (
    <div className="flex flex-col h-full rounded-2xl border border-white/[0.04] bg-[#030305]/80 backdrop-blur-md overflow-hidden shadow-2xl">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] bg-white/[0.01]">
        <div className="flex items-center space-x-2 font-mono text-[10px] text-white/40 uppercase tracking-widest font-bold">
          <Terminal className="w-3.5 h-3.5 text-cyber-cyan" />
          <span>High Frequency Algorithmic Order Stream</span>
        </div>
        <div className="flex space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase">STREAMING</span>
        </div>
      </div>

      {/* Terminal Logs Window */}
      <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-2 select-text h-[340px] bg-[#020204]">
        <div className="flex flex-col space-y-2 justify-end min-h-full">
          <AnimatePresence initial={false}>
            {visibleLogs.map((log) => {
              const isBuy = log.type === 'BUY';
              const isSell = log.type === 'SELL';
              const isCancel = log.type === 'CANCEL';

              return (
                <motion.div
                  key={log.orderId + log.timestamp}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className="flex items-center justify-between font-mono text-[11px] leading-relaxed border-b border-white/[0.01] pb-1"
                >
                  {/* Left part: Time and ID */}
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="text-white/30 font-mono">{log.timestamp}</span>
                    <span className="text-white/60 font-mono font-semibold">{log.orderId}</span>
                  </div>

                  {/* Center part: Type badge */}
                  <div className="flex items-center space-x-4">
                    <span className={`
                      font-mono font-bold text-[10px] px-1.5 py-0.5 rounded tracking-wide text-center w-14
                      ${isBuy 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : isSell 
                          ? 'bg-cyber-violet/10 text-cyber-violet border border-cyber-violet/20' 
                          : 'bg-cyber-amber/10 text-cyber-amber border border-cyber-amber/20'
                      }
                    `}>
                      {log.type}
                    </span>

                    {/* Price and quantity details */}
                    <div className="flex items-center space-x-3 w-40 justify-end">
                      <span className="text-white/80 font-mono">
                        ${log.price.toFixed(2)}
                      </span>
                      <span className="text-white/40 font-mono text-[10px]">
                        x{log.qty}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span className={`
                      font-mono font-bold text-[9px] uppercase tracking-wider text-right w-16
                      ${log.status === 'FILLED' 
                        ? 'text-emerald-400 text-glow-cyan' 
                        : log.status === 'PARTIAL' 
                          ? 'text-cyber-cyan' 
                          : 'text-cyber-amber'
                      }
                    `}>
                      {log.status}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { Submission } from '../../types';
import GlowCard from '../shared/GlowCard';

interface SubmissionCardProps {
  submission: Submission;
  onRunBots: (submission: Submission) => void;
}

export default function SubmissionCard({ submission, onRunBots }: SubmissionCardProps) {
  const getStatusBadge = (status: Submission['status']) => {
    switch (status) {
      case 'uploading':
        return (
          <span className="flex items-center px-2 py-0.5 rounded font-mono text-[9px] bg-cyber-amber/10 border border-cyber-amber/35 text-cyber-amber tracking-wider font-bold uppercase animate-pulse">
            <span>UPLOADING</span>
          </span>
        );
      case 'extracting':
        return (
          <span className="flex items-center px-2 py-0.5 rounded font-mono text-[9px] bg-cyber-violet/10 border border-cyber-violet/35 text-cyber-violet tracking-wider font-bold uppercase animate-pulse">
            <span>EXTRACTING</span>
          </span>
        );
      case 'building':
        return (
          <span className="flex items-center px-2 py-0.5 rounded font-mono text-[9px] bg-cyber-cyan/10 border border-cyber-cyan/35 text-cyber-cyan tracking-wider font-bold uppercase animate-pulse">
            <span>BUILDING</span>
          </span>
        );
      case 'running':
        return (
          <span className="flex items-center px-2 py-0.5 rounded font-mono text-[9px] bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 tracking-wider font-bold uppercase">
            <span>RUNNING</span>
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center px-2 py-0.5 rounded font-mono text-[9px] bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 tracking-wider font-bold uppercase">
            <span>COMPLETED</span>
          </span>
        );
      case 'failed':
      default:
        return (
          <span className="flex items-center px-2 py-0.5 rounded font-mono text-[9px] bg-cyber-crimson/10 border border-cyber-crimson/35 text-cyber-crimson tracking-wider font-bold uppercase">
            <span>FAILED</span>
          </span>
        );
    }
  };

  const isRunning = submission.status === 'running';

  return (
    <GlowCard glowColor={isRunning ? 'cyan' : 'violet'} className="relative overflow-hidden h-full">
      <div className="p-5 flex flex-col justify-between h-full space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-col space-y-1">
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
              Submission ID: {submission.submission_id.slice(-6).toUpperCase()}
            </span>
            <span className="text-base font-display font-bold text-white">
              {submission.team}
            </span>
          </div>
          <div>{getStatusBadge(submission.status)}</div>
        </div>

        <div className="flex flex-col space-y-1">
          <span className="text-[10px] font-mono text-white/35 uppercase tracking-wide">
            Container Endpoint
          </span>
          {isRunning && submission.container_url ? (
            <a 
              href={submission.container_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-cyber-cyan hover:underline font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap block"
            >
              {submission.container_url}
            </a>
          ) : (
            <span className="text-white/20 font-mono text-xs">—</span>
          )}
        </div>

        {/* Run Bots action button with cyan glow */}
        <div className="pt-2">
          <motion.button
            whileHover={isRunning ? { scale: 1.03 } : {}}
            whileTap={isRunning ? { scale: 0.97 } : {}}
            disabled={!isRunning}
            onClick={() => onRunBots(submission)}
            className={`
              w-full py-2 px-3 rounded-lg font-display text-[11px] font-bold tracking-wider uppercase flex items-center justify-center space-x-1.5 transition-all duration-300
              ${isRunning 
                ? 'bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan text-cyber-cyan text-glow-cyan shadow-glow-cyan' 
                : 'bg-white/[0.02] border border-white/5 text-white/20 cursor-not-allowed'
              }
            `}
          >
            <Play className="w-3 h-3" />
            <span>Run Bots</span>
          </motion.button>
        </div>
      </div>
    </GlowCard>
  );
}

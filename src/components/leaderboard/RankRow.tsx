import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Submission } from '../../types';

interface RankRowProps {
  submission: Submission;
  rank: number;
  onSelect: (id: string) => void;
}

export default function RankRow({ submission, rank, onSelect }: RankRowProps) {
  const getStatusBadge = (status: Submission['status']) => {
    switch (status) {
      case 'uploading':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded font-mono text-[10px] bg-cyber-amber/10 border border-cyber-amber/35 text-cyber-amber tracking-wider font-bold uppercase animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-cyber-amber" />
            <span>UPLOADING</span>
          </span>
        );
      case 'extracting':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded font-mono text-[10px] bg-cyber-violet/10 border border-cyber-violet/35 text-cyber-violet tracking-wider font-bold uppercase animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-cyber-violet" />
            <span>EXTRACTING</span>
          </span>
        );
      case 'building':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded font-mono text-[10px] bg-cyber-cyan/10 border border-cyber-cyan/35 text-cyber-cyan tracking-wider font-bold uppercase animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-cyber-cyan" />
            <span>BUILDING</span>
          </span>
        );
      case 'running':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded font-mono text-[10px] bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 tracking-wider font-bold uppercase animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>RUNNING</span>
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded font-mono text-[10px] bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 tracking-wider font-bold uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>COMPLETED</span>
          </span>
        );
      case 'failed':
      default:
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded font-mono text-[10px] bg-cyber-crimson/10 border border-cyber-crimson/35 text-cyber-crimson tracking-wider font-bold uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-cyber-crimson" />
            <span>FAILED</span>
          </span>
        );
    }
  };

  const isRank1 = rank === 1;
  const shortId = submission.submission_id.length > 6 
    ? submission.submission_id.slice(-6) 
    : submission.submission_id;

  return (
    <motion.tr
      layout
      onClick={() => onSelect(submission.submission_id)}
      initial={{ opacity: 0, y: 15 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        backgroundColor: isRank1 
          ? 'rgba(0, 245, 255, 0.04)' 
          : 'rgba(255, 255, 255, 0.02)',
        borderColor: isRank1 
          ? 'rgba(0, 245, 255, 0.45)' 
          : 'rgba(255, 255, 255, 0.05)',
        boxShadow: isRank1 
          ? '0 8px 32px 0 rgba(0, 245, 255, 0.12), 0 0 20px 0 rgba(0, 245, 255, 0.2)' 
          : '0 4px 16px 0 rgba(0, 0, 0, 0.3)'
      }}
      whileHover={{ 
        y: -3, 
        scale: 1.008,
        borderColor: isRank1 ? 'rgba(0, 245, 255, 0.8)' : 'rgba(0, 245, 255, 0.35)',
        transition: { duration: 0.15 }
      }}
      transition={{ 
        type: 'spring', 
        stiffness: 180, 
        damping: 24,
        layout: { duration: 0.45, type: 'spring' }
      }}
      className="border-b backdrop-blur-md rounded-xl cursor-pointer group transition-colors duration-300"
    >
      {/* Rank Column */}
      <td className="px-6 py-4.5 font-display font-bold text-sm text-center w-20">
        <div className="flex items-center justify-center">
          {isRank1 ? (
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-cyber-cyan/20 border border-cyber-cyan text-cyber-cyan text-glow-cyan">
              1
            </span>
          ) : rank === 2 ? (
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-cyber-violet/20 border border-cyber-violet/50 text-cyber-violet text-glow-violet">
              2
            </span>
          ) : rank === 3 ? (
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-cyber-amber/20 border border-cyber-amber/50 text-cyber-amber text-glow-amber">
              3
            </span>
          ) : (
            <span className="text-white/40 group-hover:text-white/80 transition-colors font-mono">{rank}</span>
          )}
        </div>
      </td>

      {/* Team ID Column */}
      <td className="px-6 py-4.5 font-mono text-sm text-white/70">
        {shortId}
      </td>

      {/* Team Name Column */}
      <td className="px-6 py-4.5 font-display font-bold text-sm">
        <div className="flex items-center space-x-3">
          <div 
            className={`
              w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-xs border
              ${isRank1 
                ? 'bg-cyber-cyan/10 border-cyber-cyan text-cyber-cyan' 
                : 'bg-white/[0.04] border-white/[0.08] text-white/70 group-hover:border-white/20'
              }
            `}
          >
            {(submission.team || 'T').charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className={`text-sm ${isRank1 ? 'text-cyber-cyan text-glow-cyan' : 'text-white/90'}`}>
              {submission.team}
            </span>
          </div>
        </div>
      </td>

      {/* Status Column */}
      <td className="px-6 py-4.5 text-center">
        <div className="flex justify-center">{getStatusBadge(submission.status)}</div>
      </td>

      {/* Container URL Column */}
      <td className="px-6 py-4.5 font-mono text-sm text-cyber-cyan text-glow-cyan">
        {submission.status === 'running' && submission.container_url ? (
          <a 
            href={submission.container_url} 
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={(e) => e.stopPropagation()} 
            className="hover:underline"
          >
            {submission.container_url}
          </a>
        ) : (
          <span className="text-white/20">—</span>
        )}
      </td>

      {/* Link Arrow icon */}
      <td className="px-4 py-4.5 w-10">
        <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-cyber-cyan group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </td>
    </motion.tr>
  );
}

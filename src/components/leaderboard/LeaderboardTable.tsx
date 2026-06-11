import { motion } from 'framer-motion';
import RankRow from './RankRow';
import { Submission } from '../../types';

interface LeaderboardTableProps {
  submissions: Submission[];
  onSelectSubmission: (id: string) => void;
}

export default function LeaderboardTable({ submissions, onSelectSubmission }: LeaderboardTableProps) {
  if (submissions.length === 0) {
    return (
      <div className="w-full py-16 rounded-xl border border-white/[0.04] bg-white/[0.01] backdrop-blur-md shadow-2xl flex flex-col items-center justify-center space-y-2">
        <span className="text-white/30 font-mono text-sm">No active submissions</span>
        <span className="text-white/10 font-mono text-xs">Run a sandbox container from the Submission Terminal</span>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-white/[0.04] bg-white/[0.01] backdrop-blur-md shadow-2xl">
      <table className="w-full border-collapse text-left">
        {/* Table Headers */}
        <thead>
          <tr className="border-b border-white/[0.05] bg-white/[0.01]">
            <th className="px-6 py-4 font-display text-[11px] font-bold uppercase tracking-wider text-white/40 text-center w-20">Rank</th>
            <th className="px-6 py-4 font-display text-[11px] font-bold uppercase tracking-wider text-white/40">Team ID</th>
            <th className="px-6 py-4 font-display text-[11px] font-bold uppercase tracking-wider text-white/40">Team Name</th>
            <th className="px-6 py-4 font-display text-[11px] font-bold uppercase tracking-wider text-white/40 text-center">Status</th>
            <th className="px-6 py-4 font-display text-[11px] font-bold uppercase tracking-wider text-white/40">Container URL</th>
            <th className="px-4 py-4 w-10"></th>
          </tr>
        </thead>
        
        {/* Animated Table Body Rows */}
        <motion.tbody 
          layout 
          className="divide-y divide-white/[0.03]"
        >
          {submissions.map((sub, index) => (
            <RankRow
              key={sub.submission_id}
              submission={sub}
              rank={index + 1}
              onSelect={onSelectSubmission}
            />
          ))}
        </motion.tbody>
      </table>
    </div>
  );
}

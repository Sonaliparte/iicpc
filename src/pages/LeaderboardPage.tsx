import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Zap, Activity, HelpCircle } from 'lucide-react';
import LeaderboardTable from '../components/leaderboard/LeaderboardTable';
import { useLeaderboardStore } from '../store/leaderboardStore';
import GlowCard from '../components/shared/GlowCard';
import { ViewType } from '../App';

interface LeaderboardPageProps {
  navigateTo: (view: ViewType, param?: string) => void;
}

export default function LeaderboardPage({ navigateTo }: LeaderboardPageProps) {
  const teams = useLeaderboardStore((state) => state.teams);
  const submissions = useLeaderboardStore((state) => state.submissions);
  const selectTeam = useLeaderboardStore((state) => state.selectTeam);
  const startPolling = useLeaderboardStore((state) => state.startPolling);
  const stopPolling = useLeaderboardStore((state) => state.stopPolling);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  const handleSelectTeam = (id: string) => {
    selectTeam(id);
    navigateTo('analytics', id);
  };

  // Calculate stats
  const totalTps = teams.reduce((acc, t) => acc + t.peakTps, 0);
  const avgLatency = Number((teams.reduce((acc, t) => acc + t.p99Latency, 0) / teams.length).toFixed(2));
  const activeStressors = submissions.filter(s => s.status === 'running' || s.status === 'building').length;

  return (
    <div className="space-y-6">
      {/* Upper Floating Statistics Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <GlowCard glowColor="cyan" hover3D>
          <div className="p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Global Throughput</span>
              <span className="text-2xl font-mono font-bold mt-1 text-cyber-cyan text-glow-cyan">
                {(totalTps / 1000).toFixed(1)}k <span className="text-xs text-white/50">req/s</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyber-cyan" />
            </div>
          </div>
        </GlowCard>

        <GlowCard glowColor="violet" hover3D>
          <div className="p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Active Sandboxes</span>
              <span className="text-2xl font-mono font-bold mt-1 text-cyber-violet text-glow-violet">
                {activeStressors} / {submissions.length || teams.length} <span className="text-xs text-white/50">stressing</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cyber-violet/10 border border-cyber-violet/20 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyber-violet" />
            </div>
          </div>
        </GlowCard>

        <GlowCard glowColor="amber" hover3D>
          <div className="p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Cluster Average P99</span>
              <span className="text-2xl font-mono font-bold mt-1 text-cyber-amber text-glow-amber">
                {avgLatency} <span className="text-xs text-white/50">ms</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cyber-amber/10 border border-cyber-amber/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-cyber-amber animate-pulse" />
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Main Grid: Live Leaderboard Title & Table */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
          <div className="flex flex-col">
            <h2 className="text-2xl font-display font-bold uppercase tracking-wider text-white">
              Live Standings
            </h2>
            <p className="text-xs text-white/40">
              Live stress-testing telemetry from isolated sandbox containers. Click a row to view micro-analytics.
            </p>
          </div>
          
          <div className="flex items-center space-x-2 text-[10px] font-mono text-white/30 bg-white/[0.01] border border-white/[0.05] rounded-lg px-2.5 py-1">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Updates every 3 seconds</span>
          </div>
        </div>

        {/* Levitating Ranks Table */}
        <LeaderboardTable submissions={submissions} onSelectSubmission={handleSelectTeam} />
      </div>
    </div>
  );
}

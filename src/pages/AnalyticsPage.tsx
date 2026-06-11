import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Activity, BarChart2, ShieldCheck, ChevronRight, Play } from 'lucide-react';
import { useLeaderboardStore } from '../store/leaderboardStore';
import { Submission } from '../types';
import LatencyChart from '../components/analytics/LatencyChart';
import TpsGauge from '../components/analytics/TpsGauge';
import BotFleetViz from '../components/analytics/BotFleetViz';
import FillLogStream from '../components/analytics/FillLogStream';
import SubmissionCard from '../components/analytics/SubmissionCard';
import GlowCard from '../components/shared/GlowCard';

export default function AnalyticsPage() {
  const teams = useLeaderboardStore((state) => state.teams);
  const submissions = useLeaderboardStore((state) => state.submissions);
  const selectedTeamId = useLeaderboardStore((state) => state.selectedTeamId);
  const selectTeam = useLeaderboardStore((state) => state.selectTeam);
  const logs = useLeaderboardStore((state) => state.logs);
  const startPolling = useLeaderboardStore((state) => state.startPolling);
  const stopPolling = useLeaderboardStore((state) => state.stopPolling);
  const addToast = useLeaderboardStore((state) => state.addToast);

  // Modal State for Bot configuration
  const [selectedSubForBots, setSelectedSubForBots] = useState<Submission | null>(null);
  const [botCount, setBotCount] = useState<number>(10);
  const [duration, setDuration] = useState<number>(30);

  // Poll submissions on mount
  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  const team = teams.find((t) => t.id === selectedTeamId) || teams[0];

  // Get current live statistics from history
  const scoreHistory = team.scoreHistory;
  const currentStats = scoreHistory[scoreHistory.length - 1] || {
    tps: team.peakTps,
    p99: team.p99Latency
  };

  const runningSubmissions = submissions.filter(
    (s) => s.status === 'running' || s.status === 'building' || s.status === 'uploading' || s.status === 'extracting'
  );

  const handleRunBotsClick = (sub: Submission) => {
    setSelectedSubForBots(sub);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header: Team Switcher Select */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyber-violet/10 border border-cyber-violet/30 text-cyber-violet shadow-glass-violet">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5 text-xs text-white/40 uppercase tracking-widest font-mono">
              <span>Telemetry Center</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-cyber-cyan text-glow-cyan font-bold">{team.name}</span>
            </div>
            <h2 className="text-xl font-display font-bold uppercase tracking-wider text-white">
              Container Performance Specs
            </h2>
          </div>
        </div>

        {/* Dynamic drop selector to switch team focus */}
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Select Container Node:</span>
          <select
            value={selectedTeamId}
            onChange={(e) => selectTeam(e.target.value)}
            className="px-3.5 py-1.5 text-xs font-mono font-bold bg-[#030305] border border-cyber-cyan/30 rounded-xl text-cyber-cyan focus:border-cyber-cyan shadow-glass-cyan cursor-pointer transition-colors"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id} className="bg-space-void font-mono">
                {t.name} (Rank #{teams.findIndex(x => x.id === t.id) + 1})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Real-time Running Submissions List */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Running Pods</span>
          <div className="h-1.5 w-1.5 rounded-full bg-cyber-cyan animate-ping" />
        </div>
        
        {runningSubmissions.length === 0 ? (
          <div className="w-full py-8 border border-white/[0.04] bg-white/[0.01] rounded-xl text-center backdrop-blur-md">
            <span className="text-white/20 font-mono text-xs">No active running sandboxes found</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {runningSubmissions.map((sub) => (
              <SubmissionCard 
                key={sub.submission_id} 
                submission={sub} 
                onRunBots={handleRunBotsClick} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating 3D Metric tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlowCard glowColor="cyan" hover3D className="cursor-default select-none">
          <div className="p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Active Core Throughput</span>
              <span className="text-2xl font-mono font-bold mt-1 text-cyber-cyan text-glow-cyan">
                {currentStats.tps.toLocaleString()} <span className="text-xs text-white/50">req/s</span>
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-cyber-cyan/15 border border-cyber-cyan/20 flex items-center justify-center">
              <Cpu className="w-4.5 h-4.5 text-cyber-cyan" />
            </div>
          </div>
        </GlowCard>

        <GlowCard glowColor="violet" hover3D className="cursor-default select-none">
          <div className="p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Current p99 latency</span>
              <span className="text-2xl font-mono font-bold mt-1 text-cyber-violet text-glow-violet">
                {currentStats.p99.toFixed(2)} <span className="text-xs text-white/50">ms</span>
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-cyber-violet/15 border border-cyber-violet/20 flex items-center justify-center">
              <Activity className="w-4.5 h-4.5 text-cyber-violet animate-pulse" />
            </div>
          </div>
        </GlowCard>

        <GlowCard glowColor="amber" hover3D className="cursor-default select-none">
          <div className="p-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Validated Correctness</span>
              <span className="text-2xl font-mono font-bold mt-1 text-cyber-amber text-glow-amber">
                {team.correctness.toFixed(2)}% <span className="text-xs text-white/50 font-bold font-mono">ok</span>
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-cyber-amber/15 border border-cyber-amber/20 flex items-center justify-center">
              <ShieldCheck className="w-4.5 h-4.5 text-cyber-amber" />
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Main Split Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Latency Waves Line Graph (Span 2) */}
        <GlowCard glowColor="cyan" className="lg:col-span-2">
          <div className="p-5 space-y-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-cyber-cyan uppercase tracking-widest font-bold">LATENCY_SENSORS</span>
              <h3 className="text-sm font-display font-bold uppercase tracking-wider text-white">
                Live High Frequency Latency Waves
              </h3>
            </div>
            <LatencyChart data={scoreHistory} />
          </div>
        </GlowCard>

        {/* Speed Reactor circular meter */}
        <GlowCard glowColor="violet">
          <div className="p-5 space-y-4 flex flex-col h-full justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-cyber-violet uppercase tracking-widest font-bold">TRANSACTION_THRUST</span>
              <h3 className="text-sm font-display font-bold uppercase tracking-wider text-white">
                Core Reactor TPS speed
              </h3>
            </div>
            <TpsGauge tps={currentStats.tps} peakTps={team.peakTps} />
          </div>
        </GlowCard>

        {/* Orbit Fleet Simulator (Span 1) */}
        <GlowCard glowColor="violet">
          <div className="p-5 space-y-4 flex flex-col h-full justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-cyber-violet uppercase tracking-widest font-bold">STRESS_BOT_FLEET</span>
              <h3 className="text-sm font-display font-bold uppercase tracking-wider text-white">
                Sandbox bot pod fleet orbit
              </h3>
            </div>
            <BotFleetViz />
          </div>
        </GlowCard>

        {/* High Frequency order stream logs (Span 2) */}
        <div className="lg:col-span-2">
          <FillLogStream logs={logs} />
        </div>

      </div>

      {/* Bot Load Tester Modal */}
      {selectedSubForBots && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#08080f] border border-cyber-cyan/30 rounded-2xl p-6 shadow-2xl relative space-y-6"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-cyber-cyan uppercase tracking-widest font-bold">STRESS_BOT_LOAD_TESTER</span>
              <h3 className="text-lg font-display font-bold uppercase tracking-wider text-white mt-0.5">
                Launch Bot Fleet
              </h3>
              <p className="text-xs text-white/40 mt-1">
                Configure automated trading agents to stress-test your matching engine.
              </p>
            </div>

            <div className="space-y-4">
              {/* Target Endpoint */}
              <div className="flex flex-col space-y-1.5">
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Target Endpoint</span>
                <input 
                  type="text" 
                  readOnly 
                  value={selectedSubForBots.container_url || ''} 
                  className="w-full px-3 py-2 bg-space-void border border-white/10 rounded-xl font-mono text-xs text-white/60 focus:outline-none"
                />
              </div>

              {/* Bot Count Slider */}
              <div className="flex flex-col space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Bot Count</span>
                  <span className="text-xs font-mono font-bold text-cyber-cyan">{botCount} bots</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="50" 
                  value={botCount} 
                  onChange={(e) => setBotCount(Number(e.target.value))}
                  className="w-full accent-cyber-cyan"
                />
              </div>

              {/* Duration Slider */}
              <div className="flex flex-col space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Duration</span>
                  <span className="text-xs font-mono font-bold text-cyber-violet">{duration} seconds</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="60" 
                  value={duration} 
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full accent-cyber-violet"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button 
                onClick={() => setSelectedSubForBots(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.02] text-xs font-display font-bold uppercase tracking-wider text-white/70 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  addToast("Bot test queued!", "success");
                  setSelectedSubForBots(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyber-cyan to-cyber-violet text-xs font-display font-bold uppercase tracking-wider text-space-void hover:shadow-halo-cyan transition-all duration-300"
              >
                Deploy Fleet
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}

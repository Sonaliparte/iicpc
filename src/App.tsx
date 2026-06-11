import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ParticleBackground from './components/shared/ParticleBackground';
import NavBar from './components/shared/NavBar';
import FloatingSidebar from './components/shared/FloatingSidebar';
import LeaderboardPage from './pages/LeaderboardPage';
import UploadPage from './pages/UploadPage';
import AnalyticsPage from './pages/AnalyticsPage';
import { useLeaderboard } from './hooks/useLeaderboard';
import { useLeaderboardStore } from './store/leaderboardStore';

export type ViewType = 'leaderboard' | 'upload' | 'analytics';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('leaderboard');
  const selectedTeamId = useLeaderboardStore((state) => state.selectedTeamId);
  const selectTeam = useLeaderboardStore((state) => state.selectTeam);

  // Initialize simulated WebSocket updates
  useLeaderboard();

  // Handle URL hash changes for routing mock
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/analytics/')) {
        const teamId = hash.replace('#/analytics/', '');
        selectTeam(teamId);
        setCurrentView('analytics');
      } else if (hash === '#/upload') {
        setCurrentView('upload');
      } else {
        setCurrentView('leaderboard');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initial check
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [selectTeam]);

  const navigateTo = (view: ViewType, param?: string) => {
    if (view === 'analytics') {
      const teamId = param || selectedTeamId;
      window.location.hash = `#/analytics/${teamId}`;
    } else if (view === 'upload') {
      window.location.hash = '#/upload';
    } else {
      window.location.hash = '#/';
    }
    setCurrentView(view);
  };

  const toasts = useLeaderboardStore((state) => state.toasts);

  return (
    <div className="relative min-h-screen text-white overflow-hidden bg-space-void font-sans">
      {/* Background Star Particle System */}
      <ParticleBackground />

      {/* Atmospheric Nebula Gradient Background */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle at 40% 30%, #0d0720 0%, #030f18 45%, #050508 100%)',
          opacity: 0.8
        }}
      />

      {/* App Shell Layer */}
      <div className="relative z-10 flex flex-col h-screen overflow-hidden">
        {/* Top Navigation & Status Bar */}
        <NavBar currentView={currentView} navigateTo={navigateTo} />

        {/* Core Screen Container */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Floating Vertical Navigation Icons */}
          <FloatingSidebar currentView={currentView} navigateTo={navigateTo} />

          {/* Active Router Page Transition Area */}
          <main className="flex-1 overflow-y-auto px-6 pb-8 pt-2 scroll-smooth">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="h-full"
              >
                {currentView === 'leaderboard' && (
                  <LeaderboardPage navigateTo={navigateTo} />
                )}
                {currentView === 'upload' && (
                  <UploadPage />
                )}
                {currentView === 'analytics' && (
                  <AnalyticsPage />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col space-y-3 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className={`pointer-events-auto flex items-center px-4 py-3 rounded-xl border font-mono text-xs shadow-2xl backdrop-blur-md ${
                toast.type === 'error'
                  ? 'bg-cyber-crimson/10 border-cyber-crimson/35 text-cyber-crimson'
                  : toast.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400'
                  : 'bg-cyber-cyan/10 border-cyber-cyan/35 text-cyber-cyan'
              }`}
            >
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

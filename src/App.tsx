import { useState, useEffect } from 'react';
import NavBar from './components/shared/NavBar';
import LeaderboardPage from './pages/LeaderboardPage';
import UploadPage from './pages/UploadPage';
import AnalyticsPage from './pages/AnalyticsPage';
import { useLeaderboard } from './hooks/useLeaderboard';
import { useLeaderboardStore } from './store/leaderboardStore';

export type ViewType = 'leaderboard' | 'upload' | 'analytics';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('upload');
  const selectedTeamId = useLeaderboardStore((state) => state.selectedTeamId);
  const selectTeam = useLeaderboardStore((state) => state.selectTeam);
  const submissions = useLeaderboardStore((state) => state.submissions);
  const startPolling = useLeaderboardStore((state) => state.startPolling);
  const stopPolling = useLeaderboardStore((state) => state.stopPolling);
  const hasSubmissionData = submissions.length > 0;

  // Initialize simulated WebSocket updates
  useLeaderboard();

  // Keep submission status updated for upload-first flow gating
  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  // Handle URL hash changes for routing mock
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (!hasSubmissionData && hash !== '#/upload') {
        setCurrentView('upload');
        return;
      }
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
  }, [selectTeam, hasSubmissionData]);

  useEffect(() => {
    if (!hasSubmissionData) {
      setCurrentView('upload');
      if (window.location.hash !== '#/upload') {
        window.location.hash = '#/upload';
      }
    }
  }, [hasSubmissionData]);

  const navigateTo = (view: ViewType, param?: string) => {
    if (!hasSubmissionData && view !== 'upload') {
      window.location.hash = '#/upload';
      setCurrentView('upload');
      return;
    }

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
    <div className="min-h-screen text-white bg-space-void font-sans">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <NavBar
          currentView={currentView}
          navigateTo={navigateTo}
          hasSubmissionData={hasSubmissionData}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          {hasSubmissionData && currentView === 'leaderboard' && (
            <LeaderboardPage navigateTo={navigateTo} />
          )}
          {currentView === 'upload' && (
            <UploadPage />
          )}
          {hasSubmissionData && currentView === 'analytics' && (
            <AnalyticsPage />
          )}
        </main>
        <div className="fixed bottom-4 right-4 z-[100] flex max-w-sm w-full flex-col space-y-2 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`rounded-lg border px-3 py-2 text-xs ${
                toast.type === 'error'
                  ? 'bg-cyber-crimson/10 border-cyber-crimson/35 text-cyber-crimson'
                  : toast.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400'
                  : 'bg-cyber-cyan/10 border-cyber-cyan/35 text-cyber-cyan'
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

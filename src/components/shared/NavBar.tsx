import { Activity } from 'lucide-react';
import { ViewType } from '../../App';

interface NavBarProps {
  currentView: ViewType;
  navigateTo: (view: ViewType, param?: string) => void;
  hasSubmissionData: boolean;
}

export default function NavBar({ currentView, navigateTo, hasSubmissionData }: NavBarProps) {
  const navItems: Array<{ id: ViewType; label: string }> = [
    { id: 'upload', label: 'Upload' },
    { id: 'upload', label: 'Leaderboard' },
    ...(hasSubmissionData
      ? [
        { id: 'leaderboard' as ViewType, label: 'Leaderboard' },
        { id: 'analytics' as ViewType, label: 'Analytics' }
      ]
      : [])
  ];

  return (
    <aside className="w-full border-b border-white/[0.08] bg-space-void/95 px-4 py-3 backdrop-blur lg:h-screen lg:w-56 lg:border-b-0 lg:border-r lg:px-3 lg:py-5">
      <div className="flex items-center gap-2 px-2 pb-3 lg:pb-5">
        <Activity className="h-5 w-5 text-cyber-cyan" />
        <span className="text-sm font-semibold tracking-wide text-white">AlgoBenchmark</span>
      </div>
      <nav className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigateTo(item.id)}
            className={`rounded-md px-3 py-2 text-sm text-left transition-colors ${currentView === item.id
                ? 'bg-cyber-cyan/15 text-cyber-cyan'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

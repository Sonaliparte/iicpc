import { create } from 'zustand';
import { Team, FillEvent, PipelineStep, PipelineStepName, PipelineStepStatus, SubmissionStatusType, Submission } from '../types';
import { initialTeams, generateInitialLogs } from '../lib/mockData';
import { api, NetworkError } from '../lib/api';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface LeaderboardState {
  teams: Team[];
  logs: FillEvent[];
  selectedTeamId: string;
  selectedLanguage: 'C++' | 'Rust' | 'Go';
  pipelineSteps: PipelineStep[];
  pipelineStatus: 'idle' | 'running' | 'success' | 'failed';
  
  // Real APIs additions
  submissions: Submission[];
  isLoading: boolean;
  pollingInterval: any | null;
  toasts: ToastMessage[];
  
  // Actions
  setTeams: (teams: Team[]) => void;
  selectTeam: (id: string) => void;
  setSelectedLanguage: (lang: 'C++' | 'Rust' | 'Go') => void;
  addLog: (log: FillEvent) => void;
  startPipeline: () => void;
  updatePipelineStep: (name: PipelineStepName, status: PipelineStepStatus) => void;
  completePipeline: (scoreGain: number) => void;
  resetPipeline: () => void;
  triggerRandomTeamUpdate: () => void;

  // Real APIs Actions
  fetchSubmissions: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  submitCode: (file: File, team: string) => Promise<string | null>;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const initialPipelineSteps: PipelineStep[] = [
  { name: 'Upload', status: 'idle' },
  { name: 'Validate', status: 'idle' },
  { name: 'Containerize', status: 'idle' },
  { name: 'Deploy', status: 'idle' },
  { name: 'Test', status: 'idle' },
];

export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  teams: initialTeams.sort((a, b) => b.score - a.score),
  logs: generateInitialLogs(),
  selectedTeamId: 'team-1',
  selectedLanguage: 'C++', // C++ is selected by default now
  pipelineSteps: initialPipelineSteps,
  pipelineStatus: 'idle',

  // Real APIs additions initial state
  submissions: [],
  isLoading: false,
  pollingInterval: null,
  toasts: [],

  setTeams: (teams) => set({ teams: [...teams].sort((a, b) => b.score - a.score) }),
  
  selectTeam: (id) => set({ selectedTeamId: id }),
  
  setSelectedLanguage: (lang) => set({ selectedLanguage: lang }),
  
  addLog: (log) => set((state) => {
    const updatedLogs = [log, ...state.logs];
    if (updatedLogs.length > 50) {
      updatedLogs.pop();
    }
    return { logs: updatedLogs };
  }),

  startPipeline: () => set({
    pipelineStatus: 'running',
    pipelineSteps: initialPipelineSteps.map(step => 
      step.name === 'Upload' ? { ...step, status: 'running' } : step
    )
  }),

  updatePipelineStep: (name, status) => set((state) => {
    const steps = state.pipelineSteps.map((step, idx) => {
      if (step.name === name) {
        return { ...step, status };
      }
      const currentIdx = state.pipelineSteps.findIndex(s => s.name === name);
      if (status === 'success' && idx === currentIdx + 1) {
        return { ...step, status: 'running' as PipelineStepStatus };
      }
      return step;
    });

    const isFailed = status === 'failed';
    const isAllSuccess = steps.every(s => s.status === 'success');

    return {
      pipelineSteps: steps,
      pipelineStatus: isFailed ? 'failed' : isAllSuccess ? 'success' : 'running'
    };
  }),

  completePipeline: (scoreGain) => set((state) => {
    const contestantId = 'team-4';
    const updatedTeams = state.teams.map((team) => {
      if (team.id === contestantId) {
        const newScore = Math.min(99.9, Number((team.score + scoreGain).toFixed(2)));
        const newLat = Number((team.p99Latency * 0.9).toFixed(2));
        const newTps = Math.round(team.peakTps * 1.15);
        const newCorr = Math.min(100, Number((team.correctness + (100 - team.correctness) * 0.1).toFixed(2)));
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const newHistory = [
          ...team.scoreHistory,
          {
            timestamp: timeStr,
            score: newScore,
            p50: Number((newLat * 0.5).toFixed(2)),
            p90: Number((newLat * 0.85).toFixed(2)),
            p99: newLat,
            tps: newTps
          }
        ];
        if (newHistory.length > 12) newHistory.shift();

        return {
          ...team,
          score: newScore,
          p99Latency: newLat,
          peakTps: newTps,
          correctness: newCorr,
          status: 'SCORED' as SubmissionStatusType,
          scoreHistory: newHistory,
          lastUpdated: Date.now()
        };
      }
      return team;
    });

    return {
      teams: updatedTeams.sort((a, b) => b.score - a.score),
      pipelineStatus: 'success'
    };
  }),

  resetPipeline: () => set({
    pipelineStatus: 'idle',
    pipelineSteps: initialPipelineSteps
  }),

  triggerRandomTeamUpdate: () => set((state) => {
    const randomIndex = Math.floor(Math.random() * state.teams.length);
    const targetTeam = state.teams[randomIndex];
    
    const updatedTeams = state.teams.map((team, idx) => {
      if (idx === randomIndex) {
        const scoreChange = (Math.random() - 0.3) * 1.5;
        const newScore = Math.max(10, Math.min(99.9, Number((team.score + scoreChange).toFixed(2))));
        
        const statuses: SubmissionStatusType[] = ['UPLOADING', 'DEPLOYING', 'TESTING', 'SCORED'];
        const randomStatus = Math.random() > 0.8 ? statuses[Math.floor(Math.random() * 3)] : 'SCORED' as SubmissionStatusType;

        const newLatChange = (Math.random() - 0.5) * (team.p99Latency * 0.08);
        const newLat = Math.max(0.5, Number((team.p99Latency + newLatChange).toFixed(2)));
        
        const newTpsChange = (Math.random() - 0.5) * (team.peakTps * 0.08);
        const newTps = Math.max(1000, Math.round(team.peakTps + newTpsChange));

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const newHistory = [
          ...team.scoreHistory,
          {
            timestamp: timeStr,
            score: newScore,
            p50: Number((newLat * 0.5).toFixed(2)),
            p90: Number((newLat * 0.85).toFixed(2)),
            p99: newLat,
            tps: newTps
          }
        ];
        if (newHistory.length > 12) newHistory.shift();

        return {
          ...team,
          score: newScore,
          p99Latency: newLat,
          peakTps: newTps,
          status: randomStatus,
          scoreHistory: newHistory,
          lastUpdated: Date.now()
        };
      }
      return team;
    });

    return {
      teams: updatedTeams.sort((a, b) => b.score - a.score)
    };
  }),

  // Real APIs Actions implementation
  fetchSubmissions: async () => {
    try {
      const data = await api.getSubmissions();
      set({ submissions: data.submissions || [], isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      if (error instanceof NetworkError || error.message === "Backend offline") {
        get().addToast("Backend offline", "error");
      } else {
        get().addToast(error.message || "Failed to fetch submissions", "error");
      }
    }
  },

  startPolling: () => {
    const currentInterval = get().pollingInterval;
    if (currentInterval) {
      clearInterval(currentInterval);
    }
    
    get().fetchSubmissions();
    
    const interval = setInterval(() => {
      get().fetchSubmissions();
    }, 3000);
    
    set({ pollingInterval: interval });
  },

  stopPolling: () => {
    const interval = get().pollingInterval;
    if (interval) {
      clearInterval(interval);
      set({ pollingInterval: null });
    }
  },

  submitCode: async (file: File, team: string) => {
    set({ pipelineStatus: 'running' });
    try {
      const data = await api.submitCode(file, team, "cpp");
      get().addToast("Submission received, building...", "success");
      return data.submission_id;
    } catch (error: any) {
      set({ pipelineStatus: 'failed' });
      if (error instanceof NetworkError || error.message === "Backend offline") {
        get().addToast("Backend offline", "error");
      } else {
        get().addToast(error.message || "Submission failed", "error");
      }
      return null;
    }
  },

  addToast: (message, type = 'info') => {
    // Avoid duplicate error toasts for "Backend offline" to keep UI clean
    if (type === 'error' && get().toasts.some(t => t.message === message)) {
      return;
    }
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  }
}));

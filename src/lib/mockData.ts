import { Team, FillEvent } from '../types';

// Helper to generate score history waves
const generateHistory = (baseScore: number, baseLat: number, baseTps: number) => {
  const history = [];
  const now = new Date();
  for (let i = 10; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000);
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const drift = Math.sin(i * 0.8) * 2;
    const latDrift = Math.cos(i * 0.5) * (baseLat * 0.1);
    
    history.push({
      timestamp: timeStr,
      score: Math.max(10, Math.min(100, Number((baseScore + drift).toFixed(2)))),
      p50: Number((baseLat * 0.5 + latDrift * 0.4).toFixed(2)),
      p90: Number((baseLat * 0.85 + latDrift * 0.8).toFixed(2)),
      p99: Number((baseLat + latDrift).toFixed(2)),
      tps: Math.max(1000, Math.round(baseTps + Math.sin(i) * (baseTps * 0.15)))
    });
  }
  return history;
};

export const initialTeams: Team[] = [
  {
    id: "team-1",
    name: "CyberShells",
    score: 98.42,
    p99Latency: 1.25,
    peakTps: 124500,
    correctness: 99.98,
    status: "SCORED",
    scoreHistory: generateHistory(96, 1.2, 120000),
    lastUpdated: Date.now()
  },
  {
    id: "team-2",
    name: "Rustaceans",
    score: 94.15,
    p99Latency: 2.38,
    peakTps: 98200,
    correctness: 99.95,
    status: "SCORED",
    scoreHistory: generateHistory(92, 2.2, 95000),
    lastUpdated: Date.now() - 5000
  },
  {
    id: "team-3",
    name: "ByteLords",
    score: 89.70,
    p99Latency: 4.12,
    peakTps: 85100,
    correctness: 99.20,
    status: "SCORED",
    scoreHistory: generateHistory(88, 4.0, 82000),
    lastUpdated: Date.now() - 10000
  },
  {
    id: "team-4",
    name: "NullPointers",
    score: 81.25,
    p99Latency: 12.45,
    peakTps: 62000,
    correctness: 98.50,
    status: "TESTING",
    scoreHistory: generateHistory(79, 12.0, 58000),
    lastUpdated: Date.now() - 12000
  },
  {
    id: "team-5",
    name: "GoGophers",
    score: 72.40,
    p99Latency: 18.20,
    peakTps: 45800,
    correctness: 95.00,
    status: "SCORED",
    scoreHistory: generateHistory(70, 17.5, 42000),
    lastUpdated: Date.now() - 15000
  },
  {
    id: "team-6",
    name: "KernelPanics",
    score: 68.90,
    p99Latency: 24.15,
    peakTps: 38200,
    correctness: 94.10,
    status: "DEPLOYING",
    scoreHistory: generateHistory(67, 23.5, 36000),
    lastUpdated: Date.now() - 18000
  },
  {
    id: "team-7",
    name: "StackBuilders",
    score: 62.15,
    p99Latency: 35.80,
    peakTps: 29500,
    correctness: 92.40,
    status: "SCORED",
    scoreHistory: generateHistory(60, 34.0, 28000),
    lastUpdated: Date.now() - 25000
  },
  {
    id: "team-8",
    name: "QuantumCoders",
    score: 55.40,
    p99Latency: 48.90,
    peakTps: 22100,
    correctness: 89.90,
    status: "UPLOADING",
    scoreHistory: generateHistory(54, 46.5, 20000),
    lastUpdated: Date.now() - 30000
  },
  {
    id: "team-9",
    name: "BinaryBeasts",
    score: 51.80,
    p99Latency: 52.40,
    peakTps: 18400,
    correctness: 85.30,
    status: "SCORED",
    scoreHistory: generateHistory(50, 50.0, 17000),
    lastUpdated: Date.now() - 35000
  },
  {
    id: "team-10",
    name: "HackOverflow",
    score: 45.00,
    p99Latency: 180.42,
    peakTps: 12400,
    correctness: 78.20,
    status: "SCORED",
    scoreHistory: generateHistory(44, 178.0, 11000),
    lastUpdated: Date.now() - 40000
  }
];

export const generateMockLog = (): FillEvent => {
  const types: ('BUY' | 'SELL' | 'CANCEL')[] = ['BUY', 'SELL', 'CANCEL'];
  const statuses: ('FILLED' | 'PARTIAL' | 'CANCELLED')[] = ['FILLED', 'PARTIAL', 'CANCELLED'];
  const type = types[Math.floor(Math.random() * types.length)];
  const status = type === 'CANCEL' ? 'CANCELLED' : statuses[Math.floor(Math.random() * (statuses.length - 1))];
  
  const now = new Date();
  const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + `.${String(now.getMilliseconds()).padStart(3, '0')}`;
  
  return {
    timestamp,
    orderId: `ORD_${Math.floor(Math.random() * 90000 + 10000)}`,
    type,
    price: Number((Math.random() * 450 + 120).toFixed(2)),
    qty: Math.floor(Math.random() * 500 + 10) * 10,
    status
  };
};

export const generateInitialLogs = (): FillEvent[] => {
  const logs = [];
  for (let i = 0; i < 20; i++) {
    logs.push(generateMockLog());
  }
  return logs;
};

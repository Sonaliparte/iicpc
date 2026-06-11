import { Team, FillEvent } from '../types';
import { generateMockLog } from './mockData';

type WSMessageCallback = (data: any) => void;

class MockWebSocketClient {
  private listeners: Map<string, WSMessageCallback[]> = new Map();
  private intervalId: NodeJS.Timeout | null = null;
  private logIntervalId: NodeJS.Timeout | null = null;
  private isConnected = false;

  constructor() {
    this.connect();
  }

  public connect() {
    if (this.isConnected) return;
    this.isConnected = true;
    
    // Simulate connection event
    setTimeout(() => {
      this.triggerEvent('open', null);
    }, 100);

    // Simulate real-time score updates every 2.5 seconds
    this.intervalId = setInterval(() => {
      if (!this.isConnected) return;
      
      this.triggerEvent('teamUpdate', {
        randomTeamUpdate: true
      });
    }, 2500);

    // Simulate high frequency log streams every 450ms
    this.logIntervalId = setInterval(() => {
      if (!this.isConnected) return;
      
      const newLog: FillEvent = generateMockLog();
      this.triggerEvent('fillLog', newLog);
    }, 450);
  }

  public disconnect() {
    this.isConnected = false;
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.logIntervalId) clearInterval(this.logIntervalId);
    this.triggerEvent('close', null);
  }

  public addEventListener(event: string, callback: WSMessageCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  public removeEventListener(event: string, callback: WSMessageCallback) {
    if (!this.listeners.has(event)) return;
    const list = this.listeners.get(event) || [];
    const index = list.indexOf(callback);
    if (index !== -1) {
      list.splice(index, 1);
    }
  }

  private triggerEvent(event: string, data: any) {
    const list = this.listeners.get(event) || [];
    list.forEach(cb => cb(data));
  }

  // Simulate pushing a new team submission from the UI
  public submitBinary(teamId: string, teamName: string, language: string) {
    setTimeout(() => this.triggerEvent('submissionProgress', { teamId, step: 'Upload', status: 'success' }), 500);
    setTimeout(() => this.triggerEvent('submissionProgress', { teamId, step: 'Validate', status: 'success' }), 1200);
    setTimeout(() => this.triggerEvent('submissionProgress', { teamId, step: 'Containerize', status: 'success' }), 2200);
    setTimeout(() => this.triggerEvent('submissionProgress', { teamId, step: 'Deploy', status: 'success' }), 3500);
    setTimeout(() => this.triggerEvent('submissionProgress', { teamId, step: 'Test', status: 'success' }), 4800);
    
    // Scored final results update
    setTimeout(() => {
      const scoreGain = Math.random() * 5 + 1;
      this.triggerEvent('submissionComplete', {
        teamId,
        scoreGain,
        language
      });
    }, 5300);
  }
}

export const wsClient = new MockWebSocketClient();
export default wsClient;

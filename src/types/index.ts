export type SubmissionStatusType = 'UPLOADING' | 'DEPLOYING' | 'TESTING' | 'SCORED';

export interface ScoreHistory {
  timestamp: string;
  score: number;
  p50: number;
  p90: number;
  p99: number;
  tps: number;
}

export interface Team {
  id: string;
  name: string;
  score: number;
  p99Latency: number;
  peakTps: number;
  correctness: number;
  status: SubmissionStatusType;
  scoreHistory: ScoreHistory[];
  lastUpdated: number;
}

export type OrderType = 'BUY' | 'SELL' | 'CANCEL';
export type OrderStatus = 'FILLED' | 'PARTIAL' | 'CANCELLED';

export interface FillEvent {
  timestamp: string;
  orderId: string;
  type: OrderType;
  price: number;
  qty: number;
  status: OrderStatus;
}

export type PipelineStepName = 'Upload' | 'Validate' | 'Containerize' | 'Deploy' | 'Test';
export type PipelineStepStatus = 'idle' | 'running' | 'success' | 'failed';

export interface PipelineStep {
  name: PipelineStepName;
  status: PipelineStepStatus;
}

export interface Submission {
  submission_id: string;
  team: string;
  language: string;
  created_at: string;
  status: 'uploading' | 'extracting' | 'building' | 'running' | 'completed' | 'failed';
  container_url: string;
  container_port: number;
  build_log: string;
  error: string;
  cleaned_up: boolean;
}

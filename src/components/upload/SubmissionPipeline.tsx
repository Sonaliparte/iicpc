import { motion } from 'framer-motion';
import { Upload, FileCode, Box, Shield, Play, Check, X } from 'lucide-react';
import { PipelineStep } from '../../types';

interface SubmissionPipelineProps {
  status: string;
  error?: string;
}

export function getPipelineSteps(status: string, error?: string): PipelineStep[] {
  const steps: PipelineStep[] = [
    { name: 'Upload', status: 'idle' },
    { name: 'Validate', status: 'idle' },
    { name: 'Containerize', status: 'idle' },
    { name: 'Deploy', status: 'idle' },
    { name: 'Test', status: 'idle' },
  ];

  if (status === 'uploading') {
    steps[0].status = 'running';
  } else if (status === 'extracting') {
    steps[0].status = 'success';
    steps[1].status = 'running';
  } else if (status === 'building') {
    steps[0].status = 'success';
    steps[1].status = 'success';
    steps[2].status = 'running';
  } else if (status === 'running') {
    steps[0].status = 'success';
    steps[1].status = 'success';
    steps[2].status = 'success';
    steps[3].status = 'running';
  } else if (status === 'completed') {
    steps[0].status = 'success';
    steps[1].status = 'success';
    steps[2].status = 'success';
    steps[3].status = 'success';
    steps[4].status = 'success';
  } else if (status === 'failed') {
    const errLower = (error || '').toLowerCase();
    if (errLower.includes('extract') || errLower.includes('unzip') || errLower.includes('missing main.cpp')) {
      steps[0].status = 'success';
      steps[1].status = 'failed';
    } else if (errLower.includes('dockerfile') || errLower.includes('docker imagebuild') || errLower.includes('compile') || errLower.includes('build') || errLower.includes('archive')) {
      steps[0].status = 'success';
      steps[1].status = 'success';
      steps[2].status = 'failed';
    } else if (errLower.includes('container') || errLower.includes('port') || errLower.includes('health') || errLower.includes('ready')) {
      steps[0].status = 'success';
      steps[1].status = 'success';
      steps[2].status = 'success';
      steps[3].status = 'failed';
    } else {
      steps[0].status = 'success';
      steps[1].status = 'success';
      steps[2].status = 'failed';
    }
  }
  return steps;
}

export default function SubmissionPipeline({ status, error }: SubmissionPipelineProps) {
  const steps = getPipelineSteps(status, error);

  const getStepIcon = (name: string, stepStatus: string) => {
    const iconClass = "w-5 h-5";
    
    if (stepStatus === 'success') return <Check className={`${iconClass} text-emerald-400`} />;
    if (stepStatus === 'failed') return <X className={`${iconClass} text-cyber-crimson`} />;
    
    switch (name) {
      case 'Upload': return <Upload className={iconClass} />;
      case 'Validate': return <FileCode className={iconClass} />;
      case 'Containerize': return <Box className={iconClass} />;
      case 'Deploy': return <Shield className={iconClass} />;
      case 'Test': return <Play className={iconClass} />;
      default: return <Play className={iconClass} />;
    }
  };

  const isRunning = status === 'uploading' || status === 'extracting' || status === 'building' || status === 'running';
  const isSuccess = status === 'completed';

  return (
    <div className="flex flex-col space-y-6 w-full p-6 rounded-2xl border border-white/[0.04] bg-white/[0.01] backdrop-blur-md">
      <div className="flex flex-col">
        <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Sandbox Compilation & Deployment</span>
        <h3 className="text-sm font-display font-bold uppercase tracking-wider text-white mt-0.5">Automated Test Pipeline</h3>
      </div>
      
      {/* Horizontal Pipeline Wrapper */}
      <div className="relative flex flex-col md:flex-row items-center justify-between w-full md:px-12 py-6 space-y-10 md:space-y-0">
        
        {/* Connection Link SVG Underlay */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 hidden md:block z-0 px-24">
          <svg className="w-full h-2 overflow-visible" fill="none">
            {/* Background Dim Line */}
            <line 
              x1="0%" 
              y1="50%" 
              x2="100%" 
              y2="50%" 
              stroke="rgba(255,255,255,0.05)" 
              strokeWidth="2" 
              strokeDasharray="4 4" 
            />
            {/* Live Progress Line */}
            {isRunning && (
              <motion.line 
                x1="0%" 
                y1="50%" 
                x2="100%" 
                y2="50%" 
                stroke="#00f5ff" 
                strokeWidth="2" 
                strokeDasharray="6 6"
                animate={{ strokeDashoffset: [-20, 0] }}
                transition={{ duration: 1.5, ease: 'linear', repeat: Infinity }}
              />
            )}
            {isSuccess && (
              <motion.line 
                x1="0%" 
                y1="50%" 
                x2="100%" 
                y2="50%" 
                stroke="#10b981" 
                strokeWidth="2"
              />
            )}
          </svg>
        </div>

        {/* Pipeline Nodes mapping */}
        {steps.map((step, index) => {
          const stepStatus = step.status;
          const isIdle = stepStatus === 'idle';
          const isRunningStep = stepStatus === 'running';
          const isSuccessStep = stepStatus === 'success';
          const isFailedStep = stepStatus === 'failed';

          return (
            <div key={step.name} className="relative z-10 flex flex-col items-center space-y-3.5 group">
              {/* Outer floating node circle */}
              <motion.div
                animate={isRunningStep ? { 
                  scale: [1, 1.15, 1],
                  borderColor: ['#00f5ff', 'rgba(0, 245, 255, 0.4)', '#00f5ff']
                } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`
                  w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-300
                  ${isSuccessStep 
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-glass-cyan hover:shadow-halo-cyan' 
                    : isFailedStep
                      ? 'bg-cyber-crimson/10 border-cyber-crimson text-cyber-crimson shadow-glass-violet animate-bounce'
                      : isRunningStep
                        ? 'bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-glow-cyan'
                        : 'bg-space-void border-white/10 text-white/30'
                  }
                `}
              >
                {getStepIcon(step.name, stepStatus)}
              </motion.div>

              {/* Node text and description */}
              <div className="flex flex-col items-center">
                <span className={`
                  text-xs font-display font-bold uppercase tracking-wider
                  ${isRunningStep ? 'text-cyber-cyan text-glow-cyan' : isSuccessStep ? 'text-emerald-400' : isFailedStep ? 'text-cyber-crimson' : 'text-white/40'}
                `}>
                  {step.name}
                </span>
                
                <span className="text-[9px] font-mono text-white/30 uppercase mt-0.5 tracking-wide">
                  {isSuccessStep ? 'COMPLETED' : isFailedStep ? 'CRITICAL_ERR' : isRunningStep ? 'STRESSING' : 'PENDING'}
                </span>
              </div>

              {/* Mini Connecting lines for mobile layouts */}
              {index < steps.length - 1 && (
                <div className="w-0.5 h-8 bg-white/[0.04] md:hidden" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

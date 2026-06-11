import { useEffect } from 'react';
import { useLeaderboardStore } from '../store/leaderboardStore';
import { wsClient } from '../lib/wsClient';
import { FillEvent, PipelineStepName, PipelineStepStatus } from '../types';

export const useLeaderboard = () => {
  const triggerRandomTeamUpdate = useLeaderboardStore((state) => state.triggerRandomTeamUpdate);
  const addLog = useLeaderboardStore((state) => state.addLog);
  const updatePipelineStep = useLeaderboardStore((state) => state.updatePipelineStep);
  const completePipeline = useLeaderboardStore((state) => state.completePipeline);

  useEffect(() => {
    // Open WebSocket simulator connection
    wsClient.connect();

    // Listen to simulated data events
    const handleTeamUpdate = () => {
      triggerRandomTeamUpdate();
    };

    const handleFillLog = (log: FillEvent) => {
      addLog(log);
    };

    const handleSubmissionProgress = (data: { step: PipelineStepName; status: PipelineStepStatus }) => {
      updatePipelineStep(data.step, data.status);
    };

    const handleSubmissionComplete = (data: { scoreGain: number }) => {
      completePipeline(data.scoreGain);
    };

    wsClient.addEventListener('teamUpdate', handleTeamUpdate);
    wsClient.addEventListener('fillLog', handleFillLog);
    wsClient.addEventListener('submissionProgress', handleSubmissionProgress);
    wsClient.addEventListener('submissionComplete', handleSubmissionComplete);

    // Cleanup on unmount
    return () => {
      wsClient.removeEventListener('teamUpdate', handleTeamUpdate);
      wsClient.removeEventListener('fillLog', handleFillLog);
      wsClient.removeEventListener('submissionProgress', handleSubmissionProgress);
      wsClient.removeEventListener('submissionComplete', handleSubmissionComplete);
    };
  }, [triggerRandomTeamUpdate, addLog, updatePipelineStep, completePipeline]);
};

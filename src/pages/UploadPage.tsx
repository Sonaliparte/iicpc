import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCw, AlertTriangle, ShieldCheck, ExternalLink } from 'lucide-react';
import { useLeaderboardStore } from '../store/leaderboardStore';
import { api } from '../lib/api';
import LanguageSelector from '../components/upload/LanguageSelector';
import DropZone from '../components/upload/DropZone';
import SubmissionPipeline from '../components/upload/SubmissionPipeline';
import TeamNameInput from '../components/upload/TeamNameInput';
import GlowCard from '../components/shared/GlowCard';

export default function UploadPage() {
  const selectedLanguage = useLeaderboardStore((state) => state.selectedLanguage);
  const setSelectedLanguage = useLeaderboardStore((state) => state.setSelectedLanguage);
  const submitCode = useLeaderboardStore((state) => state.submitCode);
  const addToast = useLeaderboardStore((state) => state.addToast);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [teamName, setTeamName] = useState<string>('');
  
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [containerUrl, setContainerUrl] = useState<string>('');

  // Real-time status polling useEffect
  useEffect(() => {
    if (!submissionId) return;

    const pollInterval = setInterval(async () => {
      try {
        const sub = await api.getStatus(submissionId);
        setCurrentStatus(sub.status);
        if (sub.error) {
          setErrorMessage(sub.error);
        }
        if (sub.container_url) {
          setContainerUrl(sub.container_url);
        }

        // Clear polling interval when final status reached
        if (sub.status === 'completed' || sub.status === 'running' || sub.status === 'failed') {
          clearInterval(pollInterval);
          if (sub.status === 'running') {
            addToast("Compiler finished. Container is now live!", "success");
          } else if (sub.status === 'failed') {
            addToast("Build failed. See logs for details.", "error");
          }
        }
      } catch (err: any) {
        clearInterval(pollInterval);
        setCurrentStatus('failed');
        setErrorMessage(err.message || "Error polling status");
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [submissionId, addToast]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setTeamName('');
    setSubmissionId(null);
    setCurrentStatus('idle');
    setErrorMessage('');
    setContainerUrl('');
  };

  const handleDeploy = async () => {
    if (!selectedFile || !teamName) return;

    // Team name validation check
    if (teamName.length < 3 || teamName.length > 20) {
      addToast("Team name must be 3-20 characters", "error");
      return;
    }
    if (!/^[a-zA-Z0-9 ]+$/.test(teamName)) {
      addToast("Team name can only contain letters, numbers, and spaces", "error");
      return;
    }

    setErrorMessage('');
    setContainerUrl('');
    setCurrentStatus('uploading');

    try {
      const subId = await submitCode(selectedFile, teamName);
      if (!subId) {
        setCurrentStatus('failed');
        return;
      }
      setSubmissionId(subId);
    } catch (err: any) {
      setCurrentStatus('failed');
      setErrorMessage(err.message || "Failed to submit code");
    }
  };

  const isRunning = currentStatus === 'uploading' || currentStatus === 'extracting' || currentStatus === 'building' || currentStatus === 'running' && !containerUrl;
  const isSuccess = currentStatus === 'running' && !!containerUrl || currentStatus === 'completed';
  const isFailed = currentStatus === 'failed';
  const isIdle = currentStatus === 'idle';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col">
        <h2 className="text-2xl font-display font-bold uppercase tracking-wider text-white">
          Submission Terminal
        </h2>
        <p className="text-xs text-white/40">
          Submit your algorithmic code to recompile, sandbox-deploy, and stress-test real-time TPS capabilities.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <GlowCard glowColor={isSuccess ? 'cyan' : isFailed ? 'violet' : 'cyan'}>
            <div className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <LanguageSelector
              selected={selectedLanguage}
              onChange={(lang) => {
                if (!isRunning) setSelectedLanguage(lang);
              }}
            />

            {(isSuccess || isFailed) && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleClear}
                className="flex items-center space-x-2 px-4 py-2 text-xs font-mono border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl text-white/70"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>RESET TERMINAL</span>
              </motion.button>
            )}
          </div>

          <div className="w-full max-w-md pt-2">
            <TeamNameInput
              value={teamName}
              onChange={setTeamName}
              disabled={isRunning || isSuccess || isFailed}
            />
          </div>

          <DropZone
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            onClear={handleClear}
            disabled={isRunning || isSuccess || isFailed}
          />

          <div className="pt-2">
            <motion.div
              whileHover={selectedFile && teamName && !isRunning && isIdle ? { scale: 1.02 } : {}}
              whileTap={selectedFile && teamName && !isRunning && isIdle ? { scale: 0.98 } : {}}
              className="w-full bg-gradient-to-r from-cyber-cyan to-cyber-violet p-[1px] rounded-xl hover:shadow-halo-cyan transition-all duration-300"
            >
              <button
                disabled={!selectedFile || !teamName || isRunning || !isIdle}
                onClick={handleDeploy}
                className={`
                  w-full py-3.5 rounded-xl font-display font-bold text-xs tracking-wider uppercase flex items-center justify-center space-x-2 transition-all duration-300
                  ${selectedFile && teamName && !isRunning && isIdle
                    ? 'bg-space-void hover:bg-space-void/45 text-cyber-cyan text-glow-cyan'
                    : 'bg-space-void/90 text-white/20 cursor-not-allowed'
                  }
                `}
              >
                {isRunning ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-cyber-cyan" />
                    <span>{currentStatus.toUpperCase()} IN PROGRESS...</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">SANDBOX CONTAINER ONLINE</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-cyber-cyan" />
                    <span>DEPLOY BINARY TO GRID</span>
                  </>
                )}
              </button>
            </motion.div>
          </div>

          {containerUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border border-emerald-500/35 bg-emerald-500/5 rounded-xl p-4 flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2 text-emerald-400 font-display font-bold text-xs tracking-wider uppercase">
                <ShieldCheck className="w-4 h-4" />
                <span>Deployment Successful</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-white/70 font-mono text-xs">Your engine is live at:</span>
                <a
                  href={containerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyber-cyan hover:underline font-mono text-xs flex items-center space-x-1.5"
                >
                  <span>{containerUrl}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </motion.div>
          )}

          {isFailed && errorMessage && (
            <motion.div
              animate={{ x: [0, -10, 10, -10, 10, 0] }}
              transition={{ duration: 0.4 }}
              className="border border-cyber-crimson/50 bg-cyber-crimson/5 rounded-xl p-4 text-cyber-crimson font-mono text-xs flex flex-col space-y-1.5"
            >
              <div className="flex items-center space-x-2 font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-cyber-crimson" />
                <span>Pipeline Error</span>
              </div>
              <span className="text-white/80 whitespace-pre-wrap">{errorMessage}</span>
            </motion.div>
          )}
            </div>
          </GlowCard>
        </div>

        <div className="lg:col-span-1 lg:sticky lg:top-24">
          <SubmissionPipeline status={currentStatus} error={errorMessage} compact />
        </div>
      </div>
    </div>
  );
}

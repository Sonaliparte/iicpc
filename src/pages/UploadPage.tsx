import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCw, AlertTriangle, ShieldCheck, Terminal, ExternalLink } from 'lucide-react';
import { useLeaderboardStore } from '../store/leaderboardStore';
import { api } from '../lib/api';
import LanguageSelector from '../components/upload/LanguageSelector';
import DropZone from '../components/upload/DropZone';
import SubmissionPipeline from '../components/upload/SubmissionPipeline';
import TeamNameInput from '../components/upload/TeamNameInput';
import BuildLogViewer from '../components/upload/BuildLogViewer';
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
  const [buildLog, setBuildLog] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [containerUrl, setContainerUrl] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  // Real-time status polling useEffect
  useEffect(() => {
    if (!submissionId) return;

    const pollInterval = setInterval(async () => {
      try {
        const sub = await api.getStatus(submissionId);
        setCurrentStatus(sub.status);
        if (sub.build_log) {
          setBuildLog(sub.build_log);
        }
        if (sub.error) {
          setErrorMessage(sub.error);
        }
        if (sub.container_url) {
          setContainerUrl(sub.container_url);
        }

        // Keep local diagnostic logs synchronized
        setLogs((prev) => {
          const nextLogs = [...prev];
          const newMsg = `[PIPE] Pipeline status updated: ${sub.status.toUpperCase()}`;
          if (nextLogs.length === 0 || !nextLogs[nextLogs.length - 1].includes(sub.status.toUpperCase())) {
            nextLogs.push(newMsg);
          }
          return nextLogs;
        });

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
    setLogs([`[FILE] Loaded package: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`]);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setTeamName('');
    setSubmissionId(null);
    setCurrentStatus('idle');
    setBuildLog('');
    setErrorMessage('');
    setContainerUrl('');
    setLogs([]);
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
    setBuildLog('');
    setContainerUrl('');
    setCurrentStatus('uploading');
    setLogs([
      `[FILE] Loaded package: ${selectedFile.name}`,
      `[PIPE] Initiating compiler pipeline for team: ${teamName}`,
      `[PIPE] Saving uploaded zip package...`
    ]);

    try {
      const subId = await submitCode(selectedFile, teamName);
      if (!subId) {
        setCurrentStatus('failed');
        return;
      }
      setSubmissionId(subId);
      setLogs((prev) => [...prev, `[PIPE] Upload complete. Assigned ID: ${subId}`, `[PIPE] Validating archive contents...`]);
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
      
      {/* Left Columns (Span 2): Upload Action Center */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex flex-col">
          <h2 className="text-2xl font-display font-bold uppercase tracking-wider text-white">
            Submission Terminal
          </h2>
          <p className="text-xs text-white/40">
            Submit your algorithmic code to recompile, sandbox-deploy, and stress-test real-time TPS capabilities.
          </p>
        </div>

        {/* Floating Input Uploader Card */}
        <GlowCard glowColor={isSuccess ? 'cyan' : isFailed ? 'violet' : 'cyan'}>
          <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <LanguageSelector 
                selected={selectedLanguage}
                onChange={(lang) => {
                  if (!isRunning) setSelectedLanguage(lang);
                }}
              />
              
              {/* Reset button if finished */}
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

            {/* Team Name Input */}
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

            {/* Glowing Gradient Border Deploy Button */}
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
            
            {/* Live Container Success display */}
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
                  <span className="text-white/70 font-mono text-xs">
                    Your engine is live at:
                  </span>
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

            {/* Error Notification Display with shake effect */}
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

        {/* Live connected compilation pipeline */}
        <SubmissionPipeline status={currentStatus} error={errorMessage} />
      </div>

      {/* Right Column: Console Feedback & BuildLogViewer */}
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col">
          <h2 className="text-2xl font-display font-bold uppercase tracking-wider text-white">
            Console Feedback
          </h2>
          <p className="text-xs text-white/40">
            Real-time stdout compiler diagnostics and sandbox health checks.
          </p>
        </div>

        {/* Scrolling terminal showing build log if building / failed / running */}
        {(currentStatus === 'building' || buildLog || isFailed) ? (
          <BuildLogViewer logs={buildLog} />
        ) : (
          /* Sleek monospace terminal box */
          <GlowCard glowColor="violet" className="flex-1 flex flex-col h-[460px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] bg-white/[0.01]">
              <div className="flex items-center space-x-2 font-mono text-[10px] text-white/40 uppercase tracking-widest font-bold">
                <Terminal className="w-3.5 h-3.5 text-cyber-violet" />
                <span>Diagnostic Console</span>
              </div>
              
              <div className="flex space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-cyber-crimson/30" />
                <div className="w-2.5 h-2.5 rounded-full bg-cyber-amber/30" />
                <div className="w-2.5 h-2.5 rounded-full bg-cyber-cyan/30" />
              </div>
            </div>

            {/* Scrolled log entries */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-emerald-400/90 space-y-2.5 scroll-smooth select-text bg-[#030305]">
              <AnimatePresence>
                {logs.length === 0 ? (
                  <span className="text-white/20 font-mono text-center italic block pt-24 select-none">
                    Console idle. Deploy a package binary to stream diagnostics.
                  </span>
                ) : (
                  logs.map((log, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25 }}
                      className="leading-relaxed border-l-2 border-emerald-500/20 pl-2.5"
                    >
                      <span className="text-cyber-violet font-mono">{idx + 1}.</span> {log}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </GlowCard>
        )}
      </div>

    </div>
  );
}

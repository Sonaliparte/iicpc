import { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

interface BuildLogViewerProps {
  logs: string;
}

export default function BuildLogViewer({ logs }: BuildLogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col rounded-xl border border-white/[0.04] bg-[#000510] shadow-halo-cyan/5 overflow-hidden w-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04] bg-white/[0.01]">
        <div className="flex items-center space-x-2 font-mono text-[9px] text-white/35 uppercase tracking-widest font-bold">
          <Terminal className="w-3 h-3 text-cyber-cyan" />
          <span>Container Build stdout</span>
        </div>
        <div className="flex space-x-1">
          <div className="w-1.5 h-1.5 rounded-full bg-cyber-crimson/20" />
          <div className="w-1.5 h-1.5 rounded-full bg-cyber-amber/20" />
          <div className="w-1.5 h-1.5 rounded-full bg-cyber-cyan/20" />
        </div>
      </div>

      <div
        ref={containerRef}
        className="max-h-[200px] min-h-[80px] overflow-y-auto p-4 font-mono text-xs text-emerald-400/90 leading-relaxed scroll-smooth select-text"
      >
        {logs ? (
          <pre className="whitespace-pre-wrap font-mono">{logs}</pre>
        ) : (
          <span className="text-white/20 font-mono text-center italic block pt-4 select-none">
            Waiting for compilation stream...
          </span>
        )}
      </div>
    </div>
  );
}

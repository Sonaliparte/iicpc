import { useState, useRef } from 'react';
import { UploadCloud, FileCode, CheckCircle, X } from 'lucide-react';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  disabled?: boolean;
}

export default function DropZone({ onFileSelect, selectedFile, onClear, disabled = false }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const triggerInput = () => {
    fileInputRef.current?.click();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col space-y-2 w-full">
      <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Contestant Program File</span>
      
      <div 
        onDragEnter={disabled ? undefined : handleDrag}
        onDragOver={disabled ? undefined : handleDrag}
        onDragLeave={disabled ? undefined : handleDrag}
        onDrop={disabled ? undefined : handleDrop}
        className="relative w-full h-56 rounded-2xl overflow-hidden transition-all duration-300"
      >
        {/* Main Inner Container */}
        <div 
          onClick={!selectedFile && !disabled ? triggerInput : undefined}
          className={`
            relative z-10 w-full h-full rounded-2xl flex flex-col items-center justify-center px-6 border-2 border-dashed
            transition-all duration-300 text-center
            ${selectedFile 
              ? 'border-emerald-500/40 bg-emerald-500/[0.02] cursor-default' 
              : disabled
                ? 'border-white/10 bg-white/[0.02] cursor-not-allowed opacity-60'
              : isDragActive
                ? 'border-cyber-cyan bg-cyber-cyan/[0.02]'
                : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer'
            }
          `}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            className="hidden" 
            accept=".cpp,.rs,.go"
            onChange={handleChange}
          />
          
          {selectedFile ? (
            /* Selected File State */
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <FileCode className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white/90">{selectedFile.name}</span>
                <span className="text-xs font-mono text-white/40 mt-0.5">{formatBytes(selectedFile.size)}</span>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>READY FOR COMPILE</span>
                </span>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="p-1 rounded-lg bg-cyber-crimson/10 border border-cyber-crimson/30 text-cyber-crimson hover:bg-cyber-crimson/20 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Empty / Idle State */
            <div className="flex flex-col items-center space-y-3">
              <div 
                className={`
                  w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300
                  ${isDragActive 
                    ? 'bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan shadow-glow-cyan' 
                    : 'bg-white/[0.04] border-white/[0.08] text-white/40 group-hover:text-white/60'
                  }
                `}
              >
                <UploadCloud className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-bold text-white/80">
                  {isDragActive ? 'Drop code sandbox package here' : 'Drop your binary or source here'}
                </span>
                <span className="text-xs text-white/40">
                  Supports C++ (.cpp), Rust (.rs) or Go (.go) code packages
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-white/30 tracking-wider">
                OR CLICK TO BROWSE FILES
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

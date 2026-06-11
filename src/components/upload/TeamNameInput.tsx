import React, { useState } from 'react';

interface TeamNameInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function TeamNameInput({ value, onChange, disabled }: TeamNameInputProps) {
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (val: string) => {
    if (!val) {
      setError("Team name is required");
      return;
    }
    if (val.length < 3 || val.length > 20) {
      setError("Must be between 3 and 20 characters");
      return;
    }
    const isValid = /^[a-zA-Z0-9 ]+$/.test(val);
    if (!isValid) {
      setError("Only letters, numbers, and spaces allowed");
      return;
    }
    setError(null);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    validate(val);
  };

  return (
    <div className="relative w-full">
      {/* Floating Label Container */}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleTextChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          className={`
            w-full px-4 py-3.5 bg-space-void/50 border rounded-xl font-mono text-sm text-white/90 transition-all duration-300
            ${error 
              ? 'border-cyber-crimson/50 focus:border-cyber-crimson shadow-[0_0_10px_rgba(239,68,68,0.15)]' 
              : focused
                ? 'border-cyber-cyan focus:border-cyber-cyan shadow-[0_0_15px_rgba(0,245,255,0.15)]' 
                : 'border-white/10 hover:border-white/20'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          placeholder=" "
        />
        <label
          className={`
            absolute left-4 top-1/2 -translate-y-1/2 font-display text-xs tracking-wider uppercase transition-all duration-300 pointer-events-none
            ${focused || value 
              ? 'top-0 -translate-y-1/2 left-3 px-1.5 bg-[#08080f] text-cyber-cyan font-bold scale-90' 
              : 'text-white/30'
            }
            ${error ? 'text-cyber-crimson' : ''}
          `}
        >
          Team Name
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <span className="absolute left-1 -bottom-5 text-[10px] font-mono text-cyber-crimson tracking-wider">
          {error}
        </span>
      )}
    </div>
  );
}

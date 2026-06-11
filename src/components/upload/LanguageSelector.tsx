import { motion } from 'framer-motion';

type LanguageType = 'C++' | 'Rust' | 'Go';

interface LanguageSelectorProps {
  selected: LanguageType;
  onChange: (lang: LanguageType) => void;
}

export default function LanguageSelector({ selected, onChange }: LanguageSelectorProps) {
  const languages: LanguageType[] = ['C++', 'Rust', 'Go'];

  return (
    <div className="flex flex-col space-y-2">
      <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Select Runtime Environment</span>
      <div className="flex items-center space-x-3 p-1.5 rounded-xl border border-white/[0.04] bg-white/[0.01] backdrop-blur-sm w-fit">
        {languages.map((lang) => {
          const isSelected = selected === lang;
          const isDisabled = lang !== 'C++';
          
          return (
            <button
              key={lang}
              disabled={isDisabled}
              onClick={() => !isDisabled && onChange(lang)}
              className={`
                relative px-5 py-2 font-display text-xs font-bold tracking-wider rounded-lg focus:outline-none z-10 transition-colors
                ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}
              `}
            >
              <motion.span
                whileHover={!isDisabled ? { scale: 1.05, y: -1 } : {}}
                whileTap={!isDisabled ? { scale: 0.95 } : {}}
                className={`relative z-20 flex items-center justify-center ${isSelected ? 'text-cyber-cyan text-glow-cyan' : 'text-white/40 hover:text-white/80'}`}
              >
                <span>{lang}</span>
                {isDisabled && <span className="text-[8px] font-mono text-white/20 ml-1">(SOON)</span>}
              </motion.span>
              
              {isSelected && (
                <motion.div
                  layoutId="activeLangPill"
                  className="absolute inset-0 rounded-lg bg-cyber-cyan/15 border border-cyber-cyan/40 shadow-glow-cyan shadow-glass-cyan z-0"
                  transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

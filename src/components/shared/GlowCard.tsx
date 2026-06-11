import React from 'react';
import { motion } from 'framer-motion';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'violet' | 'amber';
  onClick?: () => void;
  hover3D?: boolean;
}

export default function GlowCard({ 
  children, 
  className = '', 
  glowColor = 'cyan',
  onClick,
  hover3D = false
}: GlowCardProps) {
  const getGlowStyles = () => {
    switch (glowColor) {
      case 'violet':
        return 'border-cyber-violet/20 hover:border-cyber-violet/40 shadow-glass-violet hover:shadow-halo-violet';
      case 'amber':
        return 'border-cyber-amber/20 hover:border-cyber-amber/40 shadow-glass-cyan hover:shadow-halo-amber';
      case 'cyan':
      default:
        return 'border-cyber-cyan/20 hover:border-cyber-cyan/40 shadow-glass-cyan hover:shadow-halo-cyan';
    }
  };

  const getHoverProps = () => {
    if (hover3D) {
      return {
        whileHover: { 
          y: -4, 
          rotateX: 2, 
          rotateY: 2,
          transition: { duration: 0.25, ease: 'easeOut' }
        }
      };
    }
    return {
      whileHover: { 
        y: -3,
        transition: { duration: 0.2, ease: 'easeOut' }
      }
    };
  };

  return (
    <motion.div
      {...getHoverProps()}
      onClick={onClick}
      style={hover3D ? { perspective: 1000 } : undefined}
      className={`
        relative backdrop-blur-md bg-white/[0.03] border rounded-xl 
        transition-all duration-300 ${getGlowStyles()} ${onClick ? 'cursor-pointer' : ''} ${className}
      `}
    >
      {/* Dynamic glow spotlight backdrop layer */}
      <div 
        className={`
          absolute inset-0 rounded-xl opacity-0 hover:opacity-10 transition-opacity duration-300 pointer-events-none z-0
          ${glowColor === 'cyan' ? 'bg-cyber-cyan' : glowColor === 'violet' ? 'bg-cyber-violet' : 'bg-cyber-amber'}
        `}
        style={{ filter: 'blur(35px)' }}
      />
      
      {/* Content wrapper */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </motion.div>
  );
}

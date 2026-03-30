import React from 'react';
import { Brain, Heart } from 'lucide-react';

export const MindHeartLogo = ({ className = "w-6 h-6", ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} {...props}>
      <Brain className="w-full h-full text-current" strokeWidth={1.5} />
      <Heart className="absolute -bottom-1 -right-1 w-[55%] h-[55%] text-pink-500 fill-pink-500/30 drop-shadow-sm" strokeWidth={2.5} />
    </div>
  );
};

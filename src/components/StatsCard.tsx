import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  title: string;
  value: string;
  trend?: string;
  icon: React.ElementType;
  color?: 'primary' | 'accent' | 'rose' | 'secondary' | 'amber';
  isLoading?: boolean;
  secondaryIcon?: React.ReactNode;
}

export const StatsCard = ({ 
  title, 
  value, 
  trend, 
  icon: Icon, 
  color = 'primary', 
  isLoading,
  secondaryIcon 
}: CardProps) => {
  const colorMap = {
    primary:   'bg-primary/10 text-primary',
    accent:    'bg-accent/10 text-accent',
    rose:      'bg-rose-50 text-rose-500',
    secondary: 'bg-indigo-50 text-indigo-500',
    amber:     'bg-amber-50 text-amber-500',
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] transition-all group"
    >
      <div className="flex items-start justify-between mb-6">
        <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 duration-500 ${colorMap[color]}`}>
          <Icon size={22} strokeWidth={2.5} />
        </div>
        {secondaryIcon && (
          <div className="p-2 rounded-lg bg-slate-50">
            {secondaryIcon}
          </div>
        )}
      </div>
      
      <div>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">{title}</p>
        <div className="flex items-baseline gap-2">
          {isLoading ? (
            <div className="h-9 w-24 bg-slate-100 animate-pulse rounded-lg" />
          ) : (
            <h3 className="text-[2.2rem] font-black text-[#0F172A] leading-none tracking-tighter">
              {value}
            </h3>
          )}
        </div>
        {trend && (
          <p className="text-[12px] mt-4 font-bold text-slate-400 flex items-center gap-1.5">
            <span className={trend.includes('+') ? 'text-accent' : trend.includes('-') ? 'text-rose-500' : 'text-slate-400'}>
              {trend}
            </span>
            <span>neste período</span>
          </p>
        )}
      </div>
    </motion.div>
  );
};

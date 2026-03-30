import { motion } from 'framer-motion';
import { MapPin, AlertCircle } from 'lucide-react';
import { type BranchStats } from '../services/evoApi';

interface UnitCardProps {
    unit: BranchStats;
    onDetailsClick?: () => void;
}

export const UnitCard = ({ unit, onDetailsClick }: UnitCardProps) => {
    // Real data: active + inactive from EVO API. Cancelled is not filterable via API.
    const total = (unit.activeMembers + unit.inactiveMembers) || 1;
    const retentionPct = Math.round((unit.activeMembers / total) * 100);
    const inactivePct  = Math.round((unit.inactiveMembers / total) * 100);

    return (
        <motion.div
            layout
            onClick={onDetailsClick}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -8 }}
            className="group relative bg-white rounded-[2.5rem] p-9 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(15,60,35,0.08)] transition-all duration-500 cursor-pointer overflow-hidden"
        >
            {/* Top accent line — color reflects real retention */}
            <div className={`absolute top-0 left-10 right-10 h-1 rounded-b-full transition-colors duration-500 ${
                retentionPct >= 80 ? 'bg-accent' : retentionPct >= 60 ? 'bg-amber-400' : 'bg-rose-400'
            }`} />

            {/* Subtle logo bg */}
            <div className="absolute top-8 right-8 text-[12px] font-black text-slate-100 uppercase pointer-events-none group-hover:text-slate-200 transition-colors">gb</div>

            <div className="relative z-10">
                <div className="mb-10">
                    <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-black text-primary text-[1.4rem] leading-none tracking-tight">
                            {unit.name}
                        </h4>
                        {unit.hasError && <AlertCircle size={14} className="text-rose-500" />}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-[0.1em]">
                        <MapPin size={10} className="text-slate-300" />
                        {unit.location}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-10">
                    <div>
                        <p className="text-[9px] uppercase font-black text-slate-400 tracking-[0.2em] mb-2">Ativos</p>
                        <p className="text-[2.2rem] font-black text-primary tracking-tighter leading-none">
                            {unit.hasError ? '—' : unit.activeMembers.toLocaleString('pt-BR')}
                        </p>
                    </div>
                    <div>
                        <p className="text-[9px] uppercase font-black text-slate-400 tracking-[0.2em] mb-2">Inativos</p>
                        <p className={`text-[2.2rem] font-black tracking-tighter leading-none ${inactivePct > 30 ? 'text-rose-500' : 'text-amber-500'}`}>
                            {unit.hasError ? '—' : `${inactivePct}%`}
                        </p>
                    </div>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); onDetailsClick?.(); }}
                  className="w-full py-5 rounded-2xl bg-white text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary hover:text-white hover:shadow-xl hover:shadow-primary/20 transition-all duration-500 border border-slate-100"
                >
                    Ver Detalhes da Unidade
                </button>
            </div>
        </motion.div>
    );
};

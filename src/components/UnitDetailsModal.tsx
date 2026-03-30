import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Users, TrendingUp, ArrowRight, Activity, Calendar, Zap } from 'lucide-react';
import { 
    formatNumber, 
    type BranchStats, 
    fetchTodayEntriesForBranch, 
    UNITS,
    type EntryRecord 
} from '../services/evoApi';

interface UnitDetailsModalProps {
    unit: BranchStats | null;
    isOpen: boolean;
    onClose: () => void;
    onNavigateToMembers?: (branchId: number) => void;
    onViewReport?: () => void;
}

export const UnitDetailsModal = ({ unit, isOpen, onClose, onNavigateToMembers, onViewReport }: UnitDetailsModalProps) => {
    const [todayEntries, setTodayEntries] = useState<EntryRecord[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    useEffect(() => {
        if (isOpen && unit) {
            const config = UNITS[unit.name];
            if (config) {
                setIsLoadingDetails(true);
                fetchTodayEntriesForBranch(config.token)
                    .then(entries => {
                        setTodayEntries(entries);
                    })
                    .finally(() => {
                        setIsLoadingDetails(false);
                    });
            }
        } else {
            setTodayEntries([]);
        }
    }, [isOpen, unit]);

    if (!unit) return null;

    const total = unit.activeMembers + unit.inactiveMembers;
    const retention = total > 0 ? Math.round((unit.activeMembers / total) * 100) : 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
                    >
                        {/* Header Gradient */}
                        <div className={`h-2 ${unit.hasError ? 'bg-red-200' : 'bg-gradient-to-r from-[#0F3C23] via-[#0F3C23] to-[#B1D135]'}`} />

                        <div className="p-8 sm:p-10">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all border border-slate-100"
                            >
                                <X size={20} />
                            </button>

                            {/* Header */}
                            <div className="mb-10">
                                <div className="flex items-center gap-2 text-primary font-black text-[11px] uppercase tracking-[0.2em] mb-3">
                                    <Activity size={14} /> Detalhes da Unidade
                                </div>
                                <h2 className="text-[2.5rem] font-black text-[#0F172A] leading-tight tracking-tighter mb-2">
                                    {unit.name}
                                </h2>
                                <div className="flex items-center gap-4 text-slate-400 text-[13px] font-semibold">
                                    <div className="flex items-center gap-1.5">
                                        <MapPin size={14} className="text-slate-300" />
                                        {unit.location}
                                    </div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-2 h-2 rounded-full ${unit.hasError ? 'bg-red-400' : 'bg-accent animate-pulse'}`} />
                                        {unit.hasError ? 'Erro na Conexão' : 'Operacional'}
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                                <div className="bg-[#F8FAFB] p-6 rounded-[1.8rem] border border-slate-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-2.5 bg-white rounded-xl shadow-sm">
                                            <Users size={18} className="text-primary" />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ativos</span>
                                    </div>
                                    <p className="text-[1.8rem] font-black text-primary tracking-tighter">
                                        {unit.hasError ? '—' : formatNumber(unit.activeMembers)}
                                    </p>
                                </div>

                                <div className="bg-[#F8FAFB] p-6 rounded-[1.8rem] border border-slate-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-2.5 bg-white rounded-xl shadow-sm">
                                            <Zap size={18} className="text-amber-500" />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Check-ins Hoje</span>
                                    </div>
                                    <p className="text-[1.8rem] font-black text-[#0F172A] tracking-tighter">
                                        {isLoadingDetails ? '...' : todayEntries.length}
                                    </p>
                                </div>

                                <div className="bg-[#F8FAFB] p-6 rounded-[1.8rem] border border-slate-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-2.5 bg-white rounded-xl shadow-sm">
                                            <TrendingUp size={18} className="text-accent" />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Retenção</span>
                                    </div>
                                    <p className="text-[1.8rem] font-black text-accent tracking-tighter">
                                        {unit.hasError ? '—' : `${retention}%`}
                                    </p>
                                </div>
                            </div>

                            {/* Detailed Breakdown */}
                            <div className="bg-[#0F3C23] rounded-[2rem] p-8 text-white mb-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8">
                                    <div>
                                        <h4 className="text-[1.2rem] font-black mb-1">Status da Base</h4>
                                        <p className="text-[#B1D135] text-[13px] font-bold">
                                            {unit.activeMembers > 1000 ? 'Unidade em alto desempenho' : 'Unidade em crescimento'}
                                        </p>
                                    </div>
                                    <div className="flex gap-8">
                                        <div className="text-center">
                                            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.15em] mb-1">Inativos</p>
                                            <p className="text-[1.4rem] font-black text-amber-300">{unit.hasError ? '—' : formatNumber(unit.inactiveMembers)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.15em] mb-1">Retenção</p>
                                            <p className="text-[1.4rem] font-black text-[#B1D135]">{unit.hasError ? '—' : `${retention}%`}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => { onClose(); onViewReport?.(); }}
                                    className="flex-1 h-16 bg-[#F8FAFB] hover:bg-slate-100 text-[#0F172A] rounded-2xl text-[13px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-slate-100"
                                >
                                    <Calendar size={18} /> Ver Relatório
                                </button>
                                <button
                                    onClick={() => {
                                        onClose();
                                        onNavigateToMembers?.(unit.idBranch);
                                    }}
                                    className="flex-[2] h-16 bg-primary hover:bg-[#0A2A18] text-white rounded-2xl text-[13px] font-black uppercase tracking-wider shadow-[0_8px_25px_rgba(15,60,35,0.2)] transition-all flex items-center justify-center gap-2 group"
                                >
                                    Fundo de Membros <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

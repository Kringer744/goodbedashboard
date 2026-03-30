import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Phone, Calendar, MapPin, CreditCard, Clock, Activity, Tag, BellRing, CheckCircle2, MessageSquare } from 'lucide-react';
import { getMemberStatusLabel, getMemberStatusColor, formatDate, getCachedAvgTicket, UNITS, sendPushNotification, type Member } from '../services/evoApi';

interface Props {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MemberDetailModal({ member, isOpen, onClose }: Props) {
  const [isSending, setIsSending] = useState(false);
  const [pushSent, setPushSent] = useState(false);

  if (!member) return null;

  const statusLabel = getMemberStatusLabel(member.membershipStatus);
  const statusColor = getMemberStatusColor(member.membershipStatus);
  const branchName = member.branchName
    ?? Object.entries(UNITS).find(([, cfg]) => cfg.idBranch === member.idBranch)?.[0]
    ?? `Unidade #${member.idBranch}`;
  const avgTicket = getCachedAvgTicket();

  // Calculate membership duration
  const regDate = member.registerDate ? new Date(member.registerDate) : null;
  const durationMonths = regDate ? Math.max(1, Math.round((Date.now() - regDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000))) : null;

  const fields: { icon: any; label: string; value: string | undefined; accent?: boolean }[] = [
    { icon: User, label: 'Nome Completo', value: member.name },
    { icon: Mail, label: 'E-mail', value: member.email },
    { icon: Phone, label: 'Celular', value: member.cellPhone },
    { icon: MapPin, label: 'Unidade', value: branchName },
    { icon: Calendar, label: 'Data de Cadastro', value: formatDate(member.registerDate) },
    { icon: Calendar, label: 'Data de Nascimento', value: formatDate(member.birthDate) },
    { icon: Clock, label: 'Último Acesso', value: formatDate(member.lastAccessDate) },
    { icon: Activity, label: 'Tempo como Cliente', value: durationMonths ? `${durationMonths} ${durationMonths === 1 ? 'mês' : 'meses'}` : undefined, accent: true },
    { icon: CreditCard, label: 'ID do Membro', value: `#${member.idMember}` },
    { icon: Tag, label: 'ID Branch', value: `#${member.idBranch}` },
  ];

  const handleSendPush = async () => {
    const unit = Object.values(UNITS).find(u => u.idBranch === member.idBranch);
    if (!unit) return;
    
    setIsSending(true);
    setPushSent(false);

    // Call the actual API
    await sendPushNotification(
      member.idBranch, 
      unit.token, 
      member.idMember, 
      "Sentimos sua falta na Goodbe! Volte a treinar com uma condição exclusiva."
    );

    // Give some UI feedback duration regardless of network speed
    setIsSending(false);
    setPushSent(true);
    setTimeout(() => setPushSent(false), 4000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
          >
            {/* Top Accent */}
            <div className="h-2 bg-gradient-to-r from-primary via-primary to-accent" />

            <div className="p-10 pb-8">
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
              >
                <X size={18} />
              </button>

              {/* Avatar + Name + Status */}
              <div className="flex items-start gap-6 mb-10">
                <div className="w-20 h-20 rounded-[1.8rem] bg-primary/5 flex items-center justify-center shrink-0 border-2 border-primary/10 overflow-hidden">
                  {member.photoUrl ? (
                    <img src={member.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[2rem] font-black text-primary">
                      {member.name?.charAt(0).toUpperCase() ?? '?'}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[1.8rem] font-black text-primary leading-tight tracking-tight mb-2 truncate">
                    {member.name ?? 'Sem nome'}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black"
                      style={{
                        backgroundColor: `${statusColor}18`,
                        color: statusColor,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                      {statusLabel}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {branchName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-1">
                {fields.map(({ icon: Icon, label, value, accent }) => (
                  <div
                    key={label}
                    className="flex items-center gap-5 py-4 px-5 rounded-2xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-white flex items-center justify-center shrink-0 transition-colors">
                      <Icon size={16} className={accent ? 'text-accent' : 'text-slate-400'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">{label}</p>
                      <p className={`text-[14px] font-bold truncate ${accent ? 'text-accent' : 'text-[#0F172A]'}`}>
                        {value || '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* LTV Preview (if active member) */}
              {statusLabel === 'Aluno' && durationMonths && (
                <div className="mt-8 p-8 bg-gradient-to-br from-primary to-[#1A5C36] rounded-[2rem] text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-3">Valor Estimado (LTV)</p>
                    <div className="flex items-end gap-6">
                      <div>
                        <p className="text-[2.4rem] font-black tracking-tighter leading-none">
                          R$ {(durationMonths * avgTicket).toLocaleString('pt-BR')}
                        </p>
                        <p className="text-[12px] text-accent font-bold mt-1">{durationMonths} meses × R$ {avgTicket} ticket médio (EVO)</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-white/40 font-black uppercase">Membro desde</p>
                        <p className="text-[14px] font-bold">{formatDate(member.registerDate)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Evasão/Retention Action (if Inactive) */}
              {statusLabel === 'Oportunidade' && (
                <div className="mt-8 p-6 bg-orange-50 border border-orange-100 rounded-[2rem] relative overflow-hidden">
                  <div className="flex items-center justify-between gap-4 relative z-10">
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare size={16} className="text-orange-500" />
                        <h3 className="text-[14px] font-black text-orange-900">Ação de Retenção</h3>
                      </div>
                      <p className="text-[12px] font-semibold text-orange-700/80 leading-snug pr-4">
                        Este aluno abandonou os treinos. Deseja enviar um PUSH NOTIFICATION de reativação via App da EVO?
                      </p>
                    </div>

                    <button
                      onClick={handleSendPush}
                      disabled={isSending || pushSent}
                      className={`shrink-0 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all ${
                        pushSent 
                          ? 'bg-emerald-500 text-white cursor-default' 
                          : 'bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-500/20'
                      } ${isSending ? 'opacity-60 cursor-wait' : ''}`}
                    >
                      {isSending ? (
                        <>Enviando...</>
                      ) : pushSent ? (
                        <><CheckCircle2 size={16} /> Enviado</>
                      ) : (
                        <><BellRing size={16} /> Disparar PUSH</>
                      )}
                    </button>
                    
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

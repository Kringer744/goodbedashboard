
interface CircularKPIProps {
    label: string;
    value: string;
    subValue?: string;
    progress: number;
    icon: any;
    indicatorColor?: string;
    iconColor?: string;
    subValueColor?: string;
    isLoading?: boolean;
}

export const CircularKPI = ({
    label,
    value,
    subValue,
    progress,
    icon: Icon,
    indicatorColor = "#0F3C23",
    iconColor = "#0F3C23",
    subValueColor,
    isLoading = false,
}: CircularKPIProps) => {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    // Determine subValue color if not explicitly provided
    const trendColor = subValueColor || (subValue?.includes('↑') || subValue?.includes('+') ? '#10B981' : '#F43F5E');

    return (
        <div
            className={`rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all group relative cursor-pointer active:scale-[0.98] duration-500 ${isLoading ? 'animate-pulse' : ''}`}
            style={{
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px)',
            }}
        >
            {/* Top Gradient Bar - Exact Match (More Delicate) */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#0F3C23] via-[#0F3C23] to-[#B1D135]" />

            {/* Subtle Top Glow Overlay */}
            <div
                className="absolute top-1.5 left-0 w-full h-[50px] pointer-events-none opacity-20"
                style={{
                    background: 'linear-gradient(180deg, rgba(177, 209, 53, 0.1) 0%, rgba(255, 255, 255, 0) 100%)'
                }}
            />

            <div className="p-8 pt-10 flex items-center gap-7 relative z-10">
                <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full -rotate-90">
                        <circle
                            cx="48"
                            cy="48"
                            r={radius}
                            fill="transparent"
                            stroke="#F1F5F9"
                            strokeWidth="5"
                        />
                        <circle
                            cx="48"
                            cy="48"
                            r={radius}
                            fill="transparent"
                            stroke={indicatorColor}
                            strokeWidth="5"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute flex items-center justify-center" style={{ color: iconColor }}>
                        <Icon size={26} strokeWidth={2.5} />
                    </div>
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-black text-[#577399] uppercase tracking-[0.1em] mb-1.5 whitespace-nowrap">{label}</p>
                    <h3 className="text-[2.2rem] font-black text-[#0F172A] leading-none tracking-tighter mb-2">{value}</h3>
                    {subValue && (
                        <p className="text-[11px] font-black tracking-tight" style={{ color: trendColor }}>
                            {subValue}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

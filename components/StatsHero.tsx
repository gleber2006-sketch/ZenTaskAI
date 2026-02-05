import React from 'react';

interface StatsHeroProps {
    activeTasksCount: number;
    completionRate: number;
    highPriorityCount: number;
    upcomingCount: number;
}

const StatsHero: React.FC<StatsHeroProps> = ({
    activeTasksCount,
    completionRate,
    highPriorityCount,
    upcomingCount
}) => {
    const stats = [
        { label: 'Em Aberto', value: activeTasksCount, color: 'text-indigo-600 dark:text-indigo-400', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
        { label: 'Eficiência', value: `${completionRate}%`, color: 'text-emerald-500', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
        { label: 'Prioritárias', value: highPriorityCount, color: 'text-orange-500', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
        { label: 'Urgentes', value: upcomingCount, color: 'text-rose-500', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {stats.map((stat, i) => (
                <div key={i} className="bg-white dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm transition-all hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700/80 group">
                    <div className="flex items-center justify-between mb-1.5">
                        <div className={`p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 group-hover:scale-110 transition-transform ${stat.color}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stat.icon} /></svg>
                        </div>
                        <span className={`text-lg font-black tracking-tight ${stat.color}`}>{stat.value}</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</p>
                </div>
            ))}
        </div>
    );
};

export default StatsHero;

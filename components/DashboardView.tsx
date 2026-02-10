import React from 'react';
import { Task } from '../types';

interface DashboardViewProps {
    tasks: Task[];
    activeTasksCount: number;
    completionRate: number;
    highPriorityCount: number;
    upcomingCount: number;
}

const DashboardView: React.FC<DashboardViewProps> = ({
    tasks,
    activeTasksCount,
    completionRate,
    highPriorityCount,
    upcomingCount
}) => {
    const stats = [
        { label: 'Em Aberto', value: activeTasksCount, color: 'text-indigo-600 dark:text-indigo-400', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
        {
            label: 'Eficiência',
            value: `${completionRate}%`,
            color: completionRate > 60 ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]' : completionRate > 30 ? 'text-yellow-500' : 'text-yellow-300 drop-shadow-[0_0_10px_rgba(253,224,71,0.6)]',
            icon: 'M13 10V3L4 14h7v7l9-11h-7z'
        },
        { label: 'Prioritárias', value: highPriorityCount, color: 'text-orange-500', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
        { label: 'Urgentes', value: upcomingCount, color: 'text-rose-500', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800/40 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800/60 shadow-sm transition-all hover:shadow-xl hover:scale-[1.02] group">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 group-hover:scale-110 transition-transform ${stat.label === 'Eficiência' ? stat.color : stat.color.split(' ')[0]}`}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={stat.icon} /></svg>
                            </div>
                            <span className={`text-3xl font-black tracking-tighter ${stat.color}`}>{stat.value}</span>
                        </div>
                        <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white dark:bg-slate-800/40 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800/60 shadow-sm">
                <h3 className="text-lg font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-6 flex items-center gap-3">
                    <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>
                    Relatório de Produtividade
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Missões</p>
                        <p className="text-4xl font-black text-slate-800 dark:text-white">{tasks.length}</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Concluídas</p>
                        <p className="text-4xl font-black text-emerald-500">{tasks.filter(t => t.status === 'concluida').length}</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prazos Ativos</p>
                        <p className="text-4xl font-black text-orange-500">{tasks.filter(t => t.prazo && t.status !== 'concluida').length}</p>
                    </div>
                </div>

                <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        Sua eficiência atual é de <span className="text-emerald-500 font-black">{completionRate}%</span>.
                        Continue mantendo o ritmo para atingir suas metas semanais.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DashboardView;


import React from 'react';
import { Task } from '../types';

interface DashboardViewProps {
    tasks: Task[];
    activeTasksCount: number;
    completionRate: number;
    highPriorityCount: number;
    upcomingCount: number;
    dateRange: '1w' | '2w' | '15d' | '1m' | '3m' | 'all' | 'custom';
    setDateRange: (range: any) => void;
    financialMetrics: {
        totalEntradas: number;
        totalSaidas: number;
        saldo: number;
        tasksInPeriodCount: number;
        finishedInPeriodCount: number;
    };
    customDate: string;
    setCustomDate: (date: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
    tasks,
    activeTasksCount,
    completionRate,
    highPriorityCount,
    upcomingCount,
    dateRange,
    setDateRange,
    financialMetrics,
    customDate,
    setCustomDate
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

    const financeStats = [
        { label: 'Entradas', value: `R$ ${financialMetrics.totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'text-emerald-500', icon: 'M12 4v16m8-8H4' },
        { label: 'Saídas', value: `R$ ${financialMetrics.totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'text-rose-500', icon: 'M20 12H4' },
        { label: 'Saldo Líquido', value: `R$ ${financialMetrics.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: financialMetrics.saldo >= 0 ? 'text-indigo-500' : 'text-rose-600', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' }
    ];

    const datePeriods = [
        { id: '1w', label: '7D' },
        { id: '15d', label: '15D' },
        { id: '1m', label: '30D' },
        { id: '3m', label: '90D' },
        { id: 'all', label: 'Tudo' },
        { id: 'custom', label: '📅' }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header com Filtro de Data */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800/20 p-4 rounded-3xl border border-slate-200 dark:border-slate-800/60 shadow-sm">
                <div>
                    <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Análise de Performance</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Dados baseados no período selecionado</p>
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80">
                    {datePeriods.map(period => (
                        <button
                            key={period.id}
                            onClick={() => setDateRange(period.id)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateRange === period.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-slate-800'}`}
                        >
                            {period.label}
                        </button>
                    ))}
                </div>
            </div>

            {dateRange === 'custom' && (
                <div className="flex animate-in slide-in-from-top-2 duration-300">
                    <input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-indigo-500/50 rounded-xl p-2 px-4 text-xs font-black text-slate-700 dark:text-slate-200 shadow-xl focus:outline-none ring-2 ring-indigo-500/10"
                    />
                </div>
            )}

            {/* Stats de Produtividade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* Resumo Financeiro do Período */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {financeStats.map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800/40 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800/60 shadow-sm transition-all hover:shadow-xl hover:scale-[1.02] overflow-hidden relative group">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-125 transition-transform duration-700 group-hover:opacity-[0.08]">
                            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d={stat.icon} /></svg>
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-2 h-2 rounded-full ${stat.color.replace('text-', 'bg-')}`}></div>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</p>
                        </div>
                        <p className={`text-2xl font-black tracking-tighter ${stat.color}`}>
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            <div className="bg-white dark:bg-slate-800/40 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800/60 shadow-sm">
                <h3 className="text-lg font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-6 flex items-center gap-3">
                    <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>
                    Relatório no Período
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Missões Criadas</p>
                        <p className="text-4xl font-black text-slate-800 dark:text-white">{financialMetrics.tasksInPeriodCount}</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Missões Concluídas</p>
                        <p className="text-4xl font-black text-emerald-500">{financialMetrics.finishedInPeriodCount}</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Geral</p>
                        <p className="text-4xl font-black text-orange-500">{activeTasksCount} total</p>
                    </div>
                </div>

                <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        No período selecionado ({dateRange.toUpperCase()}), você registrou um balanço de <span className={`font-black ${financialMetrics.saldo >= 0 ? 'text-emerald-500' : 'text-rose-600'}`}>R$ {financialMetrics.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>.
                        Continue acompanhando seus fluxos para uma melhor saúde financeira.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DashboardView;

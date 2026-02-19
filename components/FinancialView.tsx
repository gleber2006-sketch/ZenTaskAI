
import React from 'react';
import { Task, Category } from '../types';

interface FinancialViewProps {
    tasks: Task[];
    categories: Category[];
    dateRange: string;
}

const FinancialView: React.FC<FinancialViewProps> = ({ tasks, categories, dateRange }) => {
    // Filtrar apenas tarefas com valor financeiro e fluxo definido
    const transactions = tasks
        .filter(t => {
            if (!t.value || !t.fluxo) return false;
            const val = parseFloat(String(t.value).replace(',', '.'));
            return !isNaN(val) && val > 0;
        })
        .sort((a, b) => {
            const dateA = (a.criada_em as any)?.seconds || 0;
            const dateB = (b.criada_em as any)?.seconds || 0;
            return dateB - dateA;
        });

    const totalIn = transactions
        .filter(t => t.fluxo === 'entrada')
        .reduce((acc, t) => acc + parseFloat(String(t.value || '0').replace(',', '.')), 0);

    const totalOut = transactions
        .filter(t => t.fluxo === 'saida')
        .reduce((acc, t) => acc + parseFloat(String(t.value || '0').replace(',', '.')), 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Header / Resumo Rápido */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-500/10 dark:bg-emerald-500/5 p-6 rounded-[2rem] border border-emerald-500/20 shadow-sm">
                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Total Entradas</p>
                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                        R$ {totalIn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-rose-500/10 dark:bg-rose-500/5 p-6 rounded-[2rem] border border-rose-500/20 shadow-sm">
                    <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Total Saídas</p>
                    <p className="text-3xl font-black text-rose-600 dark:text-rose-400">
                        R$ {totalOut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* Lista de Transações */}
            <div className="bg-white dark:bg-slate-800/40 rounded-[2.5rem] border border-slate-200 dark:border-slate-800/60 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        Extrato Detalhado
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Período: {dateRange.toUpperCase()}</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
                    {transactions.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-slate-400 font-medium">Nenhuma transação financeira registrada neste período.</p>
                        </div>
                    ) : (
                        transactions.map(task => {
                            const cat = categories.find(c => c.id === task.categoria_id);
                            return (
                                <div key={task.id} className="p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${task.fluxo === 'entrada' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                {task.fluxo === 'entrada' ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4" />
                                                )}
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-indigo-500 transition-colors">
                                                {task.titulo}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-slate-400 font-medium truncate">
                                                    {cat?.nome || 'Sem Categoria'}
                                                </span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${task.status === 'concluida'
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
                                                    {task.status === 'concluida' ? 'Realizado' : 'Projetado'}
                                                </span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                                    {(task.criada_em as any)?.toDate?.()?.toLocaleDateString() || 'Recent'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right ml-4 shrink-0">
                                        <span className={`text-sm font-black tracking-tight ${task.fluxo === 'entrada' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {task.fluxo === 'entrada' ? '+' : '-'} R$ {(() => {
                                                const val = parseFloat(String(task.value).replace(',', '.'));
                                                return isNaN(val) ? '0,00' : val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default FinancialView;

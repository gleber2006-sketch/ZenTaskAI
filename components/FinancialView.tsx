import React, { useState } from 'react';
import { Task, Category } from '../types';

interface FinancialViewProps {
    tasks: Task[];
    categories: Category[];
    dateRange: string;
}

// Sub-componente com tipagem explícita para evitar erros de prop 'key' no React map
const TransactionItem: React.FC<{
    task: Task;
    categories: Category[];
}> = ({ task, categories }) => {
    const cat = categories.find(c => c.id === task.categoria_id);
    const val = parseFloat(String(task.value).replace(',', '.'));

    return (
        <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all group border-b border-slate-100 dark:border-slate-800/40 last:border-0">
            <div className="flex items-center gap-4 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${task.fluxo === 'entrada' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
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
                        <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                            {(task.criada_em as any)?.toDate?.()?.toLocaleDateString() || 'Recente'}
                        </span>
                    </div>
                </div>
            </div>
            <div className="text-right ml-4 shrink-0">
                <span className={`text-sm font-black tracking-tight ${task.fluxo === 'entrada' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {task.fluxo === 'entrada' ? '+' : '-'} R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
            </div>
        </div>
    );
};

const FinancialView: React.FC<FinancialViewProps> = ({ tasks, categories, dateRange }) => {
    const [isProjectedVisible, setIsProjectedVisible] = useState(true);

    // Filtrar apenas tarefas com valor financeiro numérico válido e fluxo definido
    const validTransactions = tasks
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

    const realized = validTransactions.filter(t => t.status === 'concluida');
    const projected = validTransactions.filter(t => t.status !== 'concluida');

    const totalRealizedIn = realized.filter(t => t.fluxo === 'entrada').reduce((acc, t) => acc + parseFloat(String(t.value).replace(',', '.')), 0);
    const totalRealizedOut = realized.filter(t => t.fluxo === 'saida').reduce((acc, t) => acc + parseFloat(String(t.value).replace(',', '.')), 0);
    const totalProjectedIn = projected.filter(t => t.fluxo === 'entrada').reduce((acc, t) => acc + parseFloat(String(t.value).replace(',', '.')), 0);
    const totalProjectedOut = projected.filter(t => t.fluxo === 'saida').reduce((acc, t) => acc + parseFloat(String(t.value).replace(',', '.')), 0);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Realizado Section - High Visibility */}
            <div className="bg-white dark:bg-slate-800/40 rounded-[2.5rem] border-2 border-emerald-500/20 shadow-xl overflow-hidden">
                <div className="p-6 bg-emerald-500/5 border-b border-emerald-500/10 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-3">
                            <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                            Fluxo Realizado
                        </h3>
                        <p className="text-[10px] font-bold text-emerald-500/60 uppercase mt-1">Valores efetivados no período</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Real</p>
                        <p className={`text-xl font-black ${(totalRealizedIn - totalRealizedOut) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            R$ {(totalRealizedIn - totalRealizedOut).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/40 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {realized.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-slate-400 font-medium">Nenhum fluxo realizado registrado.</p>
                        </div>
                    ) : (
                        realized.map(task => <TransactionItem key={task.id} task={task} categories={categories} />)
                    )}
                </div>
            </div>

            {/* Projetado Section - Collapsible */}
            <div className="bg-white dark:bg-slate-800/40 rounded-[2.5rem] border border-slate-200 dark:border-slate-800/60 shadow-sm overflow-hidden transition-all duration-300">
                <button
                    onClick={() => setIsProjectedVisible(!isProjectedVisible)}
                    className="w-full p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Fluxo Projetado
                        </h3>
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black text-slate-500">{projected.length} itens</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Previsão Líquida</p>
                            <p className="text-sm font-black text-indigo-500">
                                R$ {(totalProjectedIn - totalProjectedOut).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 transition-transform duration-500 ${isProjectedVisible ? 'rotate-180 bg-indigo-500 text-white' : 'text-slate-400'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                </button>

                {isProjectedVisible && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/40 overflow-hidden animate-in slide-in-from-top-4 duration-500 border-t border-slate-100 dark:border-slate-800/60">
                        {projected.length === 0 ? (
                            <div className="p-10 text-center text-slate-400 text-sm font-medium">Nenhuma projeção financeira pendente.</div>
                        ) : (
                            projected.map(task => <TransactionItem key={task.id} task={task} categories={categories} />)
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinancialView;

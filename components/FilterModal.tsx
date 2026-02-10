import React, { useState } from 'react';
import { TaskStatus, TaskPriority } from '../types';

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    statusFilter: string;
    setStatusFilter: (value: any) => void;
    priorityFilter: string;
    setPriorityFilter: (value: any) => void;
    deadlineFilter: string;
    setDeadlineFilter: (value: any) => void;
    customDate: string;
    setCustomDate: (value: string) => void;
    onClear: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
    isOpen,
    onClose,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    deadlineFilter,
    setDeadlineFilter,
    customDate,
    setCustomDate,
    onClear
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 p-6 sm:p-8 animate-in slide-in-from-bottom-10 duration-500">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Filtros Inteligentes</h3>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Personalizar Visualização</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl active:scale-95 transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar pb-4">

                    {/* Status Section */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status da Tarefa</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Tudo', 'pendente', 'em_progresso', 'aguardando', 'bloqueada', 'concluida'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={`px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${statusFilter === s
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500'
                                        }`}
                                >
                                    {s === 'Tudo' ? 'Todos' : s.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Priority Section */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioridade</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['Tudo', 'baixa', 'media', 'alta', 'critica'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPriorityFilter(p)}
                                    className={`px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${priorityFilter === p
                                            ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20'
                                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Deadline Section */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prazo / Agendamento</label>
                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-2">
                                {['Tudo', 'recentes', 'antigos', 'custom'].map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => setDeadlineFilter(d)}
                                        className={`px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${deadlineFilter === d
                                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500'
                                            }`}
                                    >
                                        {d === 'Tudo' ? 'Qualquer' : d === 'custom' ? 'Escolher Dia...' : d.replace('recentes', 'Próximos').replace('antigos', 'Distantes')}
                                    </button>
                                ))}
                            </div>
                            {deadlineFilter === 'custom' && (
                                <input
                                    type="date"
                                    value={customDate}
                                    onChange={(e) => setCustomDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-indigo-500/30 rounded-xl p-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                                />
                            )}
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="mt-8 flex gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
                    <button
                        onClick={onClear}
                        className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 font-black"
                    >
                        Limpar
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-[2] py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-slate-800 transition-all active:scale-95"
                    >
                        Aplicar Filtros
                    </button>
                </div>

            </div>
        </div>
    );
};

export default FilterModal;

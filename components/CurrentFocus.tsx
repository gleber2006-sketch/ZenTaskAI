import React from 'react';
import { Task } from '../types';

interface CurrentFocusProps {
    topTask: Task | undefined;
    onToggleStatus: (task: Task) => void;
    onExitFocus: () => void;
}

const CurrentFocus: React.FC<CurrentFocusProps> = ({ topTask, onToggleStatus, onExitFocus }) => {
    if (!topTask) return null;

    return (
        <div className="mb-8 p-8 rounded-[2.5rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-600/20 relative overflow-hidden group border border-white/10 animate-in slide-in-from-top-4 duration-700">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/10 transition-all duration-700"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md">Foco Atual</span>
                    {topTask.prioridade === 'critica' && <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>}
                </div>
                <h1 className="text-3xl font-black mb-3 leading-tight tracking-tight drop-shadow-sm">{topTask.titulo}</h1>
                <p className="text-indigo-100/70 text-sm max-w-2xl line-clamp-2 mb-6 font-medium">
                    {topTask.descricao || "Sem descrição disponível. Mantenha o foco absoluto para concluir este objetivo."}
                </p>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => onToggleStatus(topTask)}
                        className="px-6 py-2.5 bg-white text-indigo-600 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all hover:bg-slate-50"
                    >
                        Concluir Foco
                    </button>
                    <button
                        onClick={onExitFocus}
                        className="text-white/60 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                        Sair do Modo Foco
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CurrentFocus;


import React, { useState, useEffect } from 'react';
import { Task, Category } from '../types';
import { getPublicTask, completeTaskExternally } from '../services/taskService';
import { fetchCategories } from '../services/categoryService';

interface SharedTaskLandingProps {
    taskId: string;
}

const SharedTaskLanding: React.FC<SharedTaskLandingProps> = ({ taskId }) => {
    const [task, setTask] = useState<Task | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);
    const [completerName, setCompleterName] = useState('');
    const [showNameInput, setShowNameInput] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    useEffect(() => {
        const loadTask = async () => {
            const data = await getPublicTask(taskId);
            if (data) {
                setTask(data);
                if (data.status === 'concluida') setIsCompleted(true);
                // Load categories to show icon/color
                const cats = await fetchCategories(data.userId);
                setCategories(cats);
            }
            setLoading(false);
        };
        loadTask();
    }, [taskId]);

    const handleComplete = async () => {
        if (!completerName.trim()) {
            setShowNameInput(true);
            return;
        }

        setCompleting(true);
        try {
            await completeTaskExternally(taskId, completerName);
            setIsCompleted(true);
        } catch (error) {
            console.error(error);
            alert("Erro ao concluir tarefa.");
        } finally {
            setCompleting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (!task) return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/20 rounded-3xl flex items-center justify-center text-rose-500 mb-6 border border-rose-100 dark:border-rose-800">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Tarefa não encontrada</h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs">Este link pode ter expirado ou a tarefa não está mais disponível publicamente.</p>
            <a href="/" className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">Ir para o ZenTask Pro</a>
        </div>
    );

    const category = categories.find(c => c.id === task.categoria_id);
    const deadline = task.prazo ? (task.prazo.toDate ? task.prazo.toDate() : new Date(task.prazo.seconds * 1000)) : null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 flex flex-col items-center justify-center">
            {/* Ambient Background Glows */}
            <div className="fixed top-0 left-0 w-96 h-96 bg-indigo-500/10 blur-[100px] -ml-40 -mt-40 pointer-events-none"></div>
            <div className="fixed bottom-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[100px] -mr-40 -mb-40 pointer-events-none"></div>

            <div className="w-full max-w-lg relative animate-in fade-in zoom-in duration-700">
                {/* Brand Header */}
                <div className="flex items-center justify-center gap-3 mb-10">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <span className="text-xl font-black text-slate-800 dark:text-white tracking-tight">ZenTask AI</span>
                </div>

                {/* Main Card */}
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-slate-200/60 dark:border-slate-800 overflow-hidden relative group">
                    {/* Progress Bar Top */}
                    <div className={`h-2 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'} transition-all duration-1000`} style={{ width: '100%' }}></div>

                    <div className="p-8 sm:p-10">
                        {/* Task Header */}
                        <div className="flex items-start justify-between mb-8">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-sm ${category?.cor || 'bg-slate-500'}`}>
                                        {category?.icone} {category?.nome || 'Tarefa'}
                                    </span>
                                    {task.prioridade === 'critica' && (
                                        <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                                    )}
                                </div>
                                <h1 className={`text-2xl sm:text-3xl font-black text-slate-800 dark:text-white leading-tight tracking-tight ${isCompleted ? 'line-through opacity-50' : ''}`}>
                                    {task.titulo}
                                </h1>
                            </div>
                        </div>

                        {/* Description */}
                        {task.descricao && (
                            <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 ring-1 ring-black/5 dark:ring-white/5">
                                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                                    {task.descricao}
                                </p>
                            </div>
                        )}

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-10">
                            {deadline && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Prazo</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        {deadline.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                                    </p>
                                </div>
                            )}
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                <p className={`text-sm font-bold ${isCompleted ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {isCompleted ? '✓ Concluída' : '⚡ Pendente'}
                                </p>
                            </div>
                        </div>

                        {/* Interactive Area */}
                        {!isCompleted ? (
                            <div className="space-y-6">
                                {showNameInput ? (
                                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Seu Nome</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white outline-none"
                                                placeholder="Digite seu nome para concluir..."
                                                value={completerName}
                                                onChange={e => setCompleterName(e.target.value)}
                                                autoFocus
                                            />
                                            <button
                                                onClick={handleComplete}
                                                disabled={completing || !completerName.trim()}
                                                className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 transition-all"
                                            >
                                                {completing ? '...' : 'Enviar'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowNameInput(true)}
                                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                        Concluir Tarefa
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="text-center p-8 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 animate-in fade-in zoom-in duration-500">
                                <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400 mb-1">Missão Cumprida!</h3>
                                <p className="text-sm text-emerald-600/60 dark:text-emerald-400/60 font-medium">
                                    {task.metadata?.external_completer_name || completerName} concluiu esta tarefa.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Marketing Footer */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-8 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Organizado com a Inteligência do ZenTask</p>
                        <div className="flex flex-col sm:flex-row gap-4 w-full">
                            <a
                                href="/"
                                className="flex-1 px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest text-center hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                            >
                                Entrar no sistema
                            </a>
                            <a
                                href="/"
                                className="flex-1 px-6 py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest text-center hover:bg-slate-800 dark:hover:bg-indigo-500 transition-all shadow-lg active:scale-95"
                            >
                                Criar conta Grátis
                            </a>
                        </div>
                    </div>
                </div>

                {/* Footer Copyright */}
                <p className="mt-8 text-center text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                    &copy; 2026 ZenTask AI . Enterprise Productivity Suite
                </p>
            </div>
        </div>
    );
};

export default SharedTaskLanding;

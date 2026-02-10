import React, { useState, useEffect, useRef } from 'react';
import { Task } from '../types';

interface CurrentFocusProps {
    topTask: Task | undefined;
    onToggleStatus: (task: Task) => void;
    onExitFocus: () => void;
    tasks: Task[]; // Recebe a lista de tarefas para permitir seleção
    onSelectFocusTask: (task: Task) => void; // Callback para definir a tarefa de foco manualmente
}

type PomodoroMode = 'work' | 'shortBreak' | 'longBreak';

const CurrentFocus: React.FC<CurrentFocusProps> = ({ topTask, onToggleStatus, onExitFocus, tasks, onSelectFocusTask }) => {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState<PomodoroMode>('work');
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            // Play notification sound or show alert
            alert(mode === 'work' ? "🚀 Ciclo de Flow concluído! Hora de uma pausa." : "☕ Pausa finalizada! Pronto para o Flow?");
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive, timeLeft, mode]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = (newMode: PomodoroMode) => {
        setIsActive(false);
        setMode(newMode);
        if (newMode === 'work') setTimeLeft(25 * 60);
        else if (newMode === 'shortBreak') setTimeLeft(5 * 60);
        else setTimeLeft(15 * 60);
    };

    // Filtra tarefas elegíveis para seleção (não concluídas)
    const availableTasks = tasks.filter(t => !t.concluida);

    // MODO IMERSIVO (ZEN WAVES v1.14.1)
    if (isActive) {
        return (
            <div
                onClick={() => setIsActive(false)}
                className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center cursor-pointer overflow-hidden animate-in fade-in duration-1000"
            >
                {/* Ondas Tecnológicas (Tech Flow) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                    {/* Orbital 1 - Lento */}
                    <div className="absolute w-[80vw] h-[80vw] md:w-[45rem] md:h-[45rem] border border-dashed border-white/5 rounded-full animate-[spin_60s_linear_infinite]"></div>
                    {/* Orbital 2 - Médio Reverso */}
                    <div className="absolute w-[60vw] h-[60vw] md:w-[35rem] md:h-[35rem] border border-dotted border-indigo-500/20 rounded-full animate-[spin_40s_linear_infinite_reverse]"></div>
                    {/* Orbital 3 - Pulso Central */}
                    <div className="absolute w-[40vw] h-[40vw] md:w-[25rem] md:h-[25rem] border border-white/10 rounded-full animate-pulse"></div>
                    {/* Orbital 4 - Ping Etereo */}
                    <div className="absolute w-[30vw] h-[30vw] md:w-[20rem] md:h-[20rem] border border-purple-500/30 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                </div>

                {/* Texto Central */}
                <div className="relative z-10 text-center space-y-8 px-4">
                    {/* Timer Responsivo - Ajustado para caber no mobile */}
                    <div className="text-7xl sm:text-9xl md:text-[10rem] lg:text-[12rem] leading-none font-thin text-white/90 font-mono tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] select-none transition-all duration-300">
                        {formatTime(timeLeft)}
                    </div>

                    <div className="space-y-4">
                        <p className="text-white/40 text-xs md:text-sm uppercase tracking-[0.5em] font-light animate-pulse">
                            {mode === 'work' ? 'Estado de Flow' : 'Recarregando'}
                        </p>
                        {topTask && (
                            <div className="max-w-xs md:max-w-md mx-auto px-4">
                                <p className="text-white/30 text-[10px] md:text-xs tracking-widest line-clamp-1 border-t border-white/10 pt-4">
                                    {topTask.titulo}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="absolute bottom-12 text-white/10 text-[10px] uppercase tracking-widest animate-bounce">
                    Toque para acordar
                </div>
            </div>
        );
    }

    return (
        <div className="mb-8 p-6 md:p-8 rounded-[3rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30 relative overflow-hidden group border border-white/10 animate-in slide-in-from-top-4 duration-700">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/10 transition-all duration-700"></div>

            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
                <div className="flex-1 w-full">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md">
                            {mode === 'work' ? 'Modo Flow' : 'Modo Pausa'}
                        </span>
                        {isActive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
                    </div>

                    {topTask ? (
                        <>
                            <h1 className="text-3xl md:text-4xl font-black mb-3 leading-tight tracking-tight drop-shadow-md">{topTask.titulo}</h1>
                            <p className="text-indigo-100/70 text-sm max-w-xl line-clamp-2 md:line-clamp-3 mb-6 font-medium">
                                {topTask.descricao || "Mantenha o foco absoluto para concluir este objetivo e entrar em estado de flow."}
                            </p>
                            <div className="flex flex-wrap items-center gap-4">
                                <button
                                    onClick={() => onToggleStatus(topTask)}
                                    className="px-6 py-3 bg-white text-indigo-600 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-slate-50 border-b-4 border-indigo-100 flex-1 md:flex-none text-center"
                                >
                                    Concluir Missão
                                </button>
                                <button
                                    onClick={() => onSelectFocusTask(null as any)} // Hack to clear task
                                    className="text-white/60 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                                >
                                    Trocar Objetivo
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                            <h1 className="text-3xl font-black mb-2 leading-tight tracking-tight">Foco Livre</h1>
                            <p className="text-indigo-100/70 text-sm mb-6 font-medium">
                                Utilize o cronômetro para focar em tarefas externas ou selecione um objetivo da sua lista.
                            </p>

                            {!isSelecting ? (
                                <button
                                    onClick={() => setIsSelecting(true)}
                                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-black uppercase tracking-widest border border-white/20 transition-all flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                    Selecionar Objetivo
                                </button>
                            ) : (
                                <div className="bg-white/10 p-2 rounded-2xl border border-white/10 max-h-48 overflow-y-auto no-scrollbar">
                                    {availableTasks.length > 0 ? (
                                        <div className="space-y-1">
                                            {availableTasks.slice(0, 5).map(task => (
                                                <button
                                                    key={task.id}
                                                    onClick={() => {
                                                        onSelectFocusTask(task);
                                                        setIsSelecting(false);
                                                    }}
                                                    className="w-full text-left p-3 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-between group/item"
                                                >
                                                    <span className="text-sm font-bold truncate pr-4">{task.titulo}</span>
                                                    <svg className="w-4 h-4 opacity-0 group-hover/item:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setIsSelecting(false)}
                                                className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center">
                                            <p className="text-sm font-medium">Nenhuma tarefa pendente.</p>
                                            <button onClick={() => setIsSelecting(false)} className="mt-2 text-xs underline">Voltar</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="w-full md:w-auto bg-white/10 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 flex flex-col items-center gap-4 shadow-inner shrink-0">
                    <div className="flex gap-2">
                        {(['work', 'shortBreak'] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => resetTimer(m)}
                                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-white text-indigo-600' : 'text-white/60 hover:bg-white/5'}`}
                            >
                                {m === 'work' ? 'Flow' : 'Pausa'}
                            </button>
                        ))}
                    </div>

                    <div className="text-6xl font-black tracking-tighter tabular-nums drop-shadow-lg font-mono">
                        {formatTime(timeLeft)}
                    </div>

                    <div className="flex gap-2 w-full">
                        <button
                            onClick={toggleTimer}
                            className={`flex-1 py-4 px-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${isActive ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-emerald-400 text-slate-900 shadow-emerald-500/20'}`}
                        >
                            {isActive ? 'Pausar' : 'Iniciar'}
                        </button>
                        <button
                            onClick={onExitFocus}
                            className="px-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all"
                            title="Sair do Modo Foco"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CurrentFocus;

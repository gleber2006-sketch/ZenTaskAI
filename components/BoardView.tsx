import React from 'react';
import { Task, Category, TaskStatus } from '../types';
import TaskItem from './TaskItem';

interface BoardViewProps {
    tasks: Task[];
    categories: Category[];
    onEdit: (task: Task) => void;
    onDelete: (id: string) => void;
    onToggleStatus: (task: Task) => void;
    onUpdateTask?: (id: string, updates: Partial<Task>) => void;
}

const statusConfig: Record<TaskStatus, { label: string; icon: string; color: string }> = {
    pendente: { label: 'Pendente', icon: '⚡', color: 'bg-slate-500' },
    em_progresso: { label: 'Em Progresso', icon: '🚀', color: 'bg-indigo-500' },
    aguardando: { label: 'Aguardando', icon: '⏳', color: 'bg-amber-500' },
    bloqueada: { label: 'Bloqueada', icon: '🚫', color: 'bg-rose-500' },
    concluida: { label: 'Concluída', icon: '✅', color: 'bg-emerald-500' }
};

const BoardView: React.FC<BoardViewProps> = ({ tasks, categories, onEdit, onDelete, onToggleStatus, onUpdateTask }) => {
    const statuses: TaskStatus[] = ['pendente', 'em_progresso', 'aguardando', 'bloqueada', 'concluida'];

    const getTasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar h-full items-start min-h-[500px]">
            {statuses.map(status => {
                const columnTasks = getTasksByStatus(status);
                const config = statusConfig[status];

                return (
                    <div key={status} className="flex-1 min-w-[280px] max-w-[320px] flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                        <div className="p-4 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50">
                            <div className="flex items-center gap-2">
                                <span className="text-xs">{config.icon}</span>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                    {config.label}
                                </h3>
                            </div>
                            <span className="text-[10px] font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400">
                                {columnTasks.length}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {columnTasks.length === 0 ? (
                                <div className="py-8 text-center">
                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">Sem tarefas</p>
                                </div>
                            ) : (
                                columnTasks.map(task => (
                                    <div key={task.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 overflow-hidden transform transition-all hover:shadow-md hover:-translate-y-0.5">
                                        <TaskItem
                                            task={task}
                                            categories={categories}
                                            onEdit={onEdit}
                                            onDelete={onDelete}
                                            onToggleStatus={onToggleStatus}
                                            onUpdateTask={onUpdateTask}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default BoardView;

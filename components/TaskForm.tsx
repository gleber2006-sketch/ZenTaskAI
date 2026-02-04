
import React, { useState, useEffect } from 'react';
import { Task, TaskPriority, TaskStatus, TaskType, Category, Subcategory } from '../types';
import { fetchCategories, fetchSubcategories } from '../services/categoryService';
import { createTask, updateTask } from '../services/taskService';
import { Timestamp } from 'firebase/firestore';

interface TaskFormProps {
    userId: string;
    onClose: () => void;
    onSuccess: () => void;
    existingTask?: Task; // If provided, edit mode
}

const TaskForm: React.FC<TaskFormProps> = ({ userId, onClose, onSuccess, existingTask }) => {
    const [loading, setLoading] = useState(false);

    // Form State
    const [titulo, setTitulo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [categoriaId, setCategoriaId] = useState('');
    const [subcategoriaId, setSubcategoriaId] = useState('');
    const [prioridade, setPrioridade] = useState<TaskPriority>('media');
    const [status, setStatus] = useState<TaskStatus>('pendente');
    const [tipo, setTipo] = useState<TaskType>('tarefa');
    const [prazo, setPrazo] = useState('');
    const [value, setValue] = useState(''); // Legacy support for 'value' visual

    // Data State
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

    useEffect(() => {
        loadCategories();
        if (existingTask) {
            setTitulo(existingTask.titulo);
            setDescricao(existingTask.descricao || '');
            setCategoriaId(existingTask.categoria_id);
            setSubcategoriaId(existingTask.subcategoria_id || '');
            setPrioridade(existingTask.prioridade);
            setStatus(existingTask.status);
            setTipo(existingTask.tipo);
            setValue(existingTask.value || '');
            // Date handling would go here (converting Timestamp to string)
        }
    }, [existingTask, userId]); // Added userId

    useEffect(() => {
        if (categoriaId) {
            loadSubcategories(categoriaId);
        } else {
            setSubcategories([]);
        }
    }, [categoriaId]);

    const loadCategories = async () => {
        try {
            const data = await fetchCategories(userId);
            setCategories(data);
            // Auto-select first if new and categories exist
            if (!existingTask && data.length > 0 && !categoriaId) {
                setCategoriaId(data[0].id);
            }
        } catch (error) {
            console.error("Failed to load categories in form", error);
        }
    };

    const loadSubcategories = async (catId: string) => {
        console.log(`📦 TaskForm: Carregando subcategorias para catId: ${catId}`);
        const data = await fetchSubcategories(catId);
        setSubcategories(data);
        console.log(`📦 TaskForm: ${data.length} subcategorias recebidas.`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!titulo.trim() || !categoriaId) return;

        setLoading(true);
        try {
            const taskData: Partial<Task> = {
                titulo,
                descricao: descricao || '',
                categoria_id: categoriaId,
                subcategoria_id: subcategoriaId || null,
                prioridade,
                status,
                tipo,
                value: value || null,
                // Garantir que prazos sejam salvos como null se vazios
                prazo: prazo ? Timestamp.fromDate(new Date(prazo)) : null,
            };

            if (existingTask) {
                await updateTask(existingTask.id, taskData);
            } else {
                await createTask(userId, taskData);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar tarefa.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">

                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {existingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <form id="task-form" onSubmit={handleSubmit} className="space-y-4">

                        {/* Title */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Título</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                                placeholder="O que precisa ser feito?"
                                value={titulo}
                                onChange={e => setTitulo(e.target.value)}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Descrição</label>
                            <textarea
                                className="w-full bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white min-h-[80px]"
                                placeholder="Detalhes adicionais..."
                                value={descricao}
                                onChange={e => setDescricao(e.target.value)}
                            />
                        </div>

                        {/* Grid 1: Category & Sub */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Categoria *</label>
                                <select
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-md py-2 px-3 text-sm outline-none dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    value={categoriaId}
                                    onChange={e => setCategoriaId(e.target.value)}
                                >
                                    <option value="" disabled>Selecione...</option>
                                    {categories.filter(c => c.ativa).map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.icone} {cat.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Subcategoria</label>
                                <select
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-md py-2 px-3 text-sm outline-none dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    value={subcategoriaId}
                                    onChange={e => setSubcategoriaId(e.target.value)}
                                    disabled={!categoriaId || subcategories.length === 0}
                                >
                                    <option value="">{subcategories.length === 0 ? 'Nenhuma disponível' : 'Nenhuma'}</option>
                                    {subcategories.filter(s => s.ativa).map(sub => (
                                        <option key={sub.id} value={sub.id}>{sub.nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Grid 2: Priority & Status */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Prioridade</label>
                                <div className="flex gap-2">
                                    {(['baixa', 'media', 'alta', 'critica'] as const).map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setPrioridade(p)}
                                            className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${prioridade === p ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900 scale-110' : 'opacity-50 hover:opacity-100'}
                          ${p === 'baixa' ? 'bg-slate-400 border-slate-500' : ''}
                          ${p === 'media' ? 'bg-amber-400 border-amber-500' : ''}
                          ${p === 'alta' ? 'bg-orange-500 border-orange-600' : ''}
                          ${p === 'critica' ? 'bg-red-600 border-red-700' : ''}
                        `}
                                            title={p}
                                        />
                                    ))}
                                    <span className="text-xs text-slate-500 self-center capitalize ml-1">{prioridade}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
                                <select
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-md py-2 px-3 text-sm outline-none dark:text-white capitalize"
                                    value={status}
                                    onChange={e => setStatus(e.target.value as TaskStatus)}
                                >
                                    <option value="pendente">Pendente</option>
                                    <option value="em_progresso">Em Progresso</option>
                                    <option value="bloqueada">Bloqueada</option>
                                    <option value="concluida">Concluída</option>
                                </select>
                            </div>
                        </div>

                        {/* Extra: Value (Legacy/Finance) */}
                        {categoriaId && categories.find(c => c.id === categoriaId)?.nome === 'Financeiro' && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Valor (R$)</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-md py-2 px-3 text-sm dark:text-white"
                                    placeholder="0,00"
                                    value={value}
                                    onChange={e => setValue(e.target.value)}
                                />
                            </div>
                        )}

                    </form>
                </div>

                <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition">
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="task-form"
                        disabled={loading}
                        className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-md transition disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : 'Salvar Tarefa'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default TaskForm;

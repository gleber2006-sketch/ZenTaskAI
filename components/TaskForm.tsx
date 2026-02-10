
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
    const [recorrencia, setRecorrencia] = useState('');
    const [value, setValue] = useState('');
    const [metadata, setMetadata] = useState<Record<string, any>>({});

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
            setRecorrencia(existingTask.recorrencia || '');
            setMetadata(existingTask.metadata || {});

            if (existingTask.prazo) {
                const date = existingTask.prazo.toDate ? existingTask.prazo.toDate() : new Date(existingTask.prazo.seconds * 1000);
                setPrazo(date.toISOString().split('T')[0]);
            }
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

    const [checklistItems, setChecklistItems] = useState<{ text: string, checked: boolean }[]>([]);

    useEffect(() => {
        if (subcategories.find(s => s.id === subcategoriaId)?.nome?.trim().toLowerCase() === 'compras') {
            // Parse from description
            const lines = descricao.split('\n');
            const items = lines
                .filter(l => l.trim().startsWith('- [ ]') || l.trim().startsWith('- [x]'))
                .map(l => ({
                    text: l.replace('- [ ]', '').replace('- [x]', '').trim(),
                    checked: l.trim().startsWith('- [x]')
                }));

            // Only update if current list is empty or if we are switching to Compras
            // Actually, best to only parse on initial load or category change
            if (items.length > 0 && checklistItems.length === 0) {
                setChecklistItems(items);
            }
        }
    }, [subcategoriaId, subcategories]);

    const updateDescriptionFromChecklist = (items: { text: string, checked: boolean }[]) => {
        const md = items.map(item => `- [${item.checked ? 'x' : ' '}] ${item.text}`).join('\n');
        setDescricao(md);
    };

    const addChecklistItem = (text: string) => {
        if (!text.trim()) return;
        const newItems = [...checklistItems, { text: text.trim(), checked: false }];
        setChecklistItems(newItems);
        updateDescriptionFromChecklist(newItems);
    };

    const toggleChecklistItem = (index: number) => {
        const newItems = [...checklistItems];
        newItems[index].checked = !newItems[index].checked;
        setChecklistItems(newItems);
        updateDescriptionFromChecklist(newItems);
    };

    const removeChecklistItem = (index: number) => {
        const newItems = checklistItems.filter((_, i) => i !== index);
        setChecklistItems(newItems);
        updateDescriptionFromChecklist(newItems);
    };

    const ChecklistEditor = () => {
        const [newItem, setNewItem] = useState('');

        return (
            <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Lista de Itens</span>
                    <span className="text-[10px] text-indigo-500 font-bold">{checklistItems.length} itens</span>
                </div>

                <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar">
                    {checklistItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 group animate-in slide-in-from-left-2 duration-200 py-1.5">
                            <button
                                type="button"
                                onClick={() => toggleChecklistItem(idx)}
                                className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all ${item.checked ? 'bg-emerald-500 border-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-indigo-400'}`}
                            >
                                {item.checked && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                            </button>
                            <span className={`text-sm flex-1 truncate py-1 ${item.checked ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200 font-bold tracking-tight'}`}>
                                {item.text}
                            </span>
                            <button
                                type="button"
                                onClick={() => removeChecklistItem(idx)}
                                className="p-3 text-slate-400 hover:text-red-500 transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <input
                        type="text"
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm flex-1 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                        placeholder="Novo item..."
                        value={newItem}
                        onChange={e => setNewItem(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addChecklistItem(newItem);
                                setNewItem('');
                            }
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => { addChecklistItem(newItem); setNewItem(''); }}
                        className="w-11 h-11 flex items-center justify-center bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition active:scale-90 shadow-lg shadow-indigo-600/20"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                    </button>
                </div>
            </div>
        );
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
                recorrencia: recorrencia || null,
                metadata: Object.keys(metadata).length > 0 ? metadata : null,
                prazo: prazo ? (() => {
                    const [y, m, d] = prazo.split('-').map(Number);
                    return Timestamp.fromDate(new Date(y, m - 1, d, 0, 0, 0, 0));
                })() : null,
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

                        {/* Description / Checklist */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Conteúdo da Tarefa</label>
                            {subcategories.find(s => s.id === subcategoriaId)?.nome?.trim().toLowerCase() === 'compras' ? (
                                <ChecklistEditor />
                            ) : (
                                <textarea
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white min-h-[120px]"
                                    placeholder="Detalhes adicionais..."
                                    value={descricao}
                                    onChange={e => setDescricao(e.target.value)}
                                />
                            )}
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
                                    <option value="aguardando">Aguardando</option>
                                    <option value="bloqueada">Bloqueada</option>
                                    <option value="concluida">Concluída</option>
                                </select>
                            </div>
                        </div>

                        {/* Grid 3: Tipo & Prazo */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tipo de Registro</label>
                                <select
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-md py-2 px-3 text-sm outline-none dark:text-white capitalize"
                                    value={tipo}
                                    onChange={e => setTipo(e.target.value as TaskType)}
                                >
                                    <option value="tarefa">Tarefa</option>
                                    <option value="rotina">Rotina</option>
                                    <option value="evento">Evento</option>
                                    <option value="meta">Meta</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Prazo / Data</label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-md py-2 px-3 text-sm outline-none dark:text-white"
                                    value={prazo}
                                    onChange={e => setPrazo(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Metadata / Info Adicional (ReadOnly for now if from AI) */}
                        {Object.keys(metadata).length > 0 && (
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Informações Adicionais (IA)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(metadata).map(([key, val]) => (
                                        <div key={key} className="flex flex-col">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">{key}</span>
                                            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">{String(val)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

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

                <div className="p-5 pb-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                    <button type="button" onClick={onClose} className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition">
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="task-form"
                        disabled={loading}
                        className="w-full sm:w-auto px-8 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/25 transition active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : 'Salvar Tarefa'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default TaskForm;

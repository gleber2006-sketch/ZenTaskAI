
import React, { useState, useEffect } from 'react';
import { Category, Subcategory } from '../types';
import { fetchCategories, createCategory, updateCategory, deleteCategory, fetchSubcategories, createSubcategory, deleteSubcategory } from '../services/categoryService';

interface CategoryManagerProps {
    userId: string;
    onClose: () => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ userId, onClose }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCatName, setNewCatName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    // Expanded for subcategories
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [newSubName, setNewSubName] = useState('');

    useEffect(() => {
        loadCategories();
    }, [userId]);

    useEffect(() => {
        if (expandedId) {
            loadSubcategories(expandedId);
        } else {
            setSubcategories([]);
        }
    }, [expandedId]);

    const loadCategories = async () => {
        setLoading(true);
        try {
            const data = await fetchCategories(userId);
            setCategories(data);
        } catch (error) {
            console.error("Failed to load categories", error);
        } finally {
            setLoading(false);
        }
    };

    const loadSubcategories = async (catId: string) => {
        try {
            const data = await fetchSubcategories(catId);
            setSubcategories(data);
        } catch (error) {
            console.error("Failed to load subcategories", error);
        }
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCatName.trim()) return;

        try {
            await createCategory(userId, {
                nome: newCatName,
                icone: '📁',
                cor: 'bg-slate-500',
                descricao: ''
            });
            setNewCatName('');
            loadCategories();
        } catch (error) {
            alert("Erro ao criar categoria");
        }
    };

    const handleDelete = async (id: string, type: 'system' | 'custom') => {
        if (!window.confirm("Tem certeza? Isso excluirá todas as tarefas e subcategorias vinculadas.")) return;
        try {
            await deleteCategory(id, type);
            loadCategories();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleToggleActive = async (cat: Category) => {
        try {
            await updateCategory(cat.id, { ativa: !cat.ativa }, cat.tipo);
            setCategories(categories.map(c => c.id === cat.id ? { ...c, ativa: !c.ativa } : c));
        } catch (error: any) {
            alert(error.message);
        }
    };

    // Subcategory Actions
    const handleAddSubcategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubName.trim() || !expandedId) return;

        try {
            await createSubcategory(expandedId, { nome: newSubName, ordem: subcategories.length });
            setNewSubName('');
            loadSubcategories(expandedId);
        } catch (error) {
            alert("Erro ao criar subcategoria");
        }
    };

    const handleDeleteSub = async (id: string) => {
        if (!window.confirm("Excluir subcategoria?")) return;
        await deleteSubcategory(id);
        if (expandedId) loadSubcategories(expandedId);
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Carregando categorias...</div>;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Gerenciar Categorias</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Organize a estrutura do seu sistema.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Add New */}
                    <form onSubmit={handleAddCategory} className="flex gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <input
                            type="text"
                            placeholder="Nome da nova categoria..."
                            className="flex-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-md text-sm px-3 py-2 text-slate-900 dark:text-white"
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                        />
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition shadow-sm">
                            Criar
                        </button>
                    </form>

                    {/* List */}
                    <div className="space-y-3">
                        {categories.map(cat => (
                            <div key={cat.id} className={`group rounded-lg border transition-all ${cat.ativa ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' : 'bg-slate-50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-900 opacity-70'}`}>

                                {/* Row Main */}
                                <div className="flex items-center gap-3 p-3">
                                    {/* Icon/Color */}
                                    <div className={`w-8 h-8 rounded-md flex items-center justify-center text-white text-sm ${cat.cor.startsWith('bg-') ? cat.cor : 'bg-slate-500'}`}>
                                        {cat.icone || (cat.tipo === 'system' ? '🔒' : '📁')}
                                    </div>

                                    {/* Name */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className={`font-medium text-sm ${cat.ativa ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500'}`}>{cat.nome}</h3>
                                            {cat.tipo === 'system' && (
                                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">Sistema</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggleActive(cat)}
                                            className={`text-xs px-2 py-1 rounded border transition ${cat.ativa ? 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-900' : 'text-slate-400 border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700'}`}
                                        >
                                            {cat.ativa ? 'Ativa' : 'Oculta'}
                                        </button>

                                        <button
                                            onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
                                            className={`p-1.5 rounded transition ${expandedId === cat.id ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                            title="Gerenciar Subcategorias"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                        </button>

                                        {cat.tipo === 'custom' && (
                                            <button
                                                onClick={() => handleDelete(cat.id, cat.tipo)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                                                title="Excluir Categoria"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Subcategories (Expanded) */}
                                {expandedId === cat.id && (
                                    <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 pl-12">
                                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Subcategorias de {cat.nome}</h4>

                                        <div className="space-y-2 mb-4">
                                            {subcategories.map(sub => (
                                                <div key={sub.id} className="flex items-center justify-between text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-md">
                                                    <span className="text-slate-700 dark:text-slate-200">{sub.nome}</span>
                                                    <button onClick={() => handleDeleteSub(sub.id)} className="text-slate-400 hover:text-red-500">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                            ))}
                                            {subcategories.length === 0 && <p className="text-xs text-slate-400 italic">Nenhuma subcategoria.</p>}
                                        </div>

                                        <form onSubmit={handleAddSubcategory} className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Nova subcategoria..."
                                                className="flex-1 text-xs border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                                                value={newSubName}
                                                onChange={(e) => setNewSubName(e.target.value)}
                                            />
                                            <button className="px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-xs font-medium rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition">
                                                Adicionar
                                            </button>
                                        </form>
                                    </div>
                                )}

                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CategoryManager;

import React, { useState, useRef, useEffect } from 'react';

interface CommandBarProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    onQuickAdd: (title: string) => Promise<void>;
    onManualAdd: () => void;
}

const CommandBar: React.FC<CommandBarProps> = ({ searchTerm, setSearchTerm, onQuickAdd, onManualAdd }) => {
    const [mode, setMode] = useState<'search' | 'create'>('search');
    const [showMenu, setShowMenu] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleModeChange = (newMode: 'search' | 'create') => {
        setMode(newMode);
        setShowMenu(false);
        setInputValue('');
        if (newMode === 'search') setSearchTerm('');
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        if (mode === 'create') {
            await onQuickAdd(inputValue.trim());
            setInputValue('');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        if (mode === 'search') {
            setSearchTerm(value);
        }
    };

    return (
        <div className="relative mb-8 group">
            <div className={`relative flex items-center bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl transition-all duration-300 shadow-lg ${mode === 'create' ? 'ring-2 ring-indigo-500/30 border-indigo-500/50 scale-[1.01]' : 'hover:border-slate-600/60'
                }`}>

                {/* Icon/Indicator */}
                <div className="pl-4 pr-2 text-slate-500">
                    {mode === 'search' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    ) : (
                        <span className="text-xs animate-pulse">⚡</span>
                    )}
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="flex-1">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        placeholder={mode === 'search' ? "Buscar tarefas..." : "O que precisa ser feito? (Enter)"}
                        className="w-full bg-transparent py-3.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
                    />
                </form>

                {/* Actions Container */}
                <div className="flex items-center gap-1 pr-2">
                    {/* Clear Button */}
                    {inputValue && (
                        <button
                            onClick={() => { setInputValue(''); setSearchTerm(''); }}
                            className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}

                    {/* Vertical Divider */}
                    <div className="w-px h-6 bg-slate-700/50 mx-1"></div>

                    {/* Plus Button */}
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className={`p-1.5 rounded-xl transition-all ${showMenu ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                            }`}
                    >
                        <svg className={`w-6 h-6 transform transition-transform duration-300 ${showMenu ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Creation Menu Dropdown */}
            {showMenu && (
                <div
                    ref={menuRef}
                    className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                >
                    <div className="p-2 space-y-1">
                        <button
                            onClick={() => handleModeChange('create')}
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors group/item"
                        >
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover/item:bg-indigo-500 group-hover/item:text-white transition-all">
                                <span className="text-xs font-bold">⚡</span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Tarefa Rápida</p>
                                <p className="text-[10px] text-slate-400 truncate tracking-tight">Criação instantânea sem IA</p>
                            </div>
                        </button>

                        <button
                            onClick={() => { onManualAdd(); setShowMenu(false); }}
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors group/item"
                        >
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover/item:bg-emerald-500 group-hover/item:text-white transition-all">
                                <span className="text-xs font-bold">📝</span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Tarefa Manual</p>
                                <p className="text-[10px] text-slate-400 truncate tracking-tight">Abrir formulário completo</p>
                            </div>
                        </button>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 font-bold text-[9px] text-slate-400 uppercase tracking-widest text-center">
                        ZenTask AI v1.5.0
                    </div>
                </div>
            )}

            {/* Mode Indicator Overlay */}
            {mode === 'create' && (
                <button
                    onClick={() => handleModeChange('search')}
                    className="absolute -top-6 right-2 text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500 hover:text-indigo-400 transition-colors animate-in fade-in slide-in-from-bottom-1"
                >
                    ← Voltar para Busca
                </button>
            )}
        </div>
    );
};

export default CommandBar;

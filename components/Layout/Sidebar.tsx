import React from 'react';
import { User } from 'firebase/auth';
import { Category } from '../../types';

interface SidebarProps {
    darkMode: boolean;
    setDarkMode: (value: boolean) => void;
    focusMode: boolean;
    setFocusMode: (value: boolean) => void;
    setShowCategoryManager: (value: boolean) => void;
    setShowSettings: (value: boolean) => void;
    activeCategory: string | 'Tudo';
    setActiveCategory: (value: string | 'Tudo') => void;
    categories: Category[];
    user: User | null;
    onLogout: () => void;
    navMode: 'tasks' | 'dashboard' | 'finance';
    setNavMode: (mode: 'tasks' | 'dashboard' | 'finance') => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    darkMode,
    setDarkMode,
    focusMode,
    setFocusMode,
    setShowCategoryManager,
    setShowSettings,
    activeCategory,
    setActiveCategory,
    categories,
    user,
    onLogout,
    navMode,
    setNavMode
}) => {
    return (
        <aside className={`w-64 bg-slate-900 dark:bg-slate-950 text-white flex flex-col shrink-0 transition-all z-20 ${focusMode ? 'hidden' : 'hidden md:flex'} border-r border-slate-800`}>
            {/* Brand */}
            <div className="h-16 flex items-center px-6 border-b border-white/5 dark:border-slate-800 justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <span className="font-bold tracking-tight text-white/90">ZenTask <span className="text-indigo-400">Pro</span></span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1">
                <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors mb-4 border border-white/5 bg-white/5 shadow-sm"
                >
                    <div className="p-1.5 bg-slate-800 rounded-lg text-indigo-400 group-hover:scale-110 transition-transform">
                        {darkMode ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                        )}
                    </div>
                    <span className="font-bold tracking-tight text-[11px] uppercase tracking-[0.1em]">Modo {darkMode ? 'Claro' : 'Escuro'}</span>
                </button>

                <button
                    onClick={() => setNavMode('tasks')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-xl transition-all border ${navMode === 'tasks' ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800 border-transparent'}`}
                >
                    <svg className={`w-5 h-5 ${navMode === 'tasks' ? 'text-white' : 'text-indigo-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" /></svg>
                    Fluxo Central
                </button>
                <button
                    onClick={() => setNavMode('finance')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-xl transition-all border ${navMode === 'finance' ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800 border-transparent'}`}
                >
                    <svg className={`w-5 h-5 ${navMode === 'finance' ? 'text-white' : 'text-emerald-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.407 2.67 1M12 17c-1.12 0-2.1-.425-2.69-1.041M12 7V5m0 14v-2" /></svg>
                    Financeiro
                </button>
                <button
                    onClick={() => setNavMode('dashboard')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-xl transition-all border ${navMode === 'dashboard' ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800 border-transparent'}`}
                >
                    <svg className={`w-5 h-5 ${navMode === 'dashboard' ? 'text-white' : 'text-indigo-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Dashboard
                </button>
                <button onClick={() => setShowCategoryManager(true)} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    Workspaces
                </button>
                <button
                    onClick={() => setFocusMode(!focusMode)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all ${focusMode ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Focar (Deep Work)
                </button>
            </nav>

            {/* Categories (Mini) */}
            <div className="px-6 py-6 border-t border-slate-800">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Categorias</p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSettings(true)}
                            className="text-slate-400 hover:text-white transition-all bg-white/5 p-1.5 rounded-lg border border-white/5 hover:border-white/20 active:scale-95 shadow-sm"
                            title="Configurações do Sistema"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                    </div>
                </div>
                <div className="space-y-1">
                    {['Tudo', ...categories.map(c => c.id)].map(catId => {
                        const category = categories.find(c => c.id === catId);
                        const isActive = activeCategory === catId;
                        return (
                            <button
                                key={catId}
                                onClick={() => setActiveCategory(catId)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all group ${isActive
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 active:scale-95'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : ''}`} style={!isActive && category ? { backgroundColor: category.cor } : {}}></div>
                                    <span className="text-sm mr-1">{catId === 'Tudo' ? '📋' : (category?.icone || '🏷️')}</span>
                                    <span className="truncate">{catId === 'Tudo' ? 'Todas as Tarefas' : (category?.nome || catId)}</span>
                                </div>
                                {isActive && <div className="w-1 h-1 bg-white rounded-full"></div>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* User Mini Profile */}
            <div className="p-4 border-t border-white/5 bg-black/20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-xs shadow-lg">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-white/90 truncate">{user?.email?.split('@')[0] || 'Usuário Pro'}</p>
                        <p className="text-[9px] text-white/40 font-medium truncate uppercase tracking-tighter">{user?.email || 'ZenTask Plan'}</p>
                    </div>
                    <button
                        onClick={onLogout}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors bg-white/5 rounded-lg border border-white/5 hover:border-red-400/20 shadow-sm"
                        title="Sair do Sistema"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;

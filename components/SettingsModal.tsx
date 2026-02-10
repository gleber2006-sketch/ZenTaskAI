import React from 'react';
import { User } from 'firebase/auth';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onShowCategoryManager: () => void;
    onForceReloadCategories: () => void;
    onForceResetCategories: () => void;
    showSupport: boolean;
    setShowSupport: (show: boolean) => void;
    onLogout: () => void;
    darkMode: boolean;
    setDarkMode: (value: boolean) => void;
    navMode: 'tasks' | 'dashboard';
    setNavMode: (mode: 'tasks' | 'dashboard') => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    user,
    onShowCategoryManager,
    onForceReloadCategories,
    onForceResetCategories,
    showSupport,
    setShowSupport,
    onLogout,
    darkMode,
    setDarkMode,
    navMode,
    setNavMode
}) => {
    console.log("⚙️ SettingsModal v1.3.2 loaded");
    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full h-full sm:h-auto sm:max-w-md bg-white dark:bg-slate-900 sm:rounded-[2.5rem] rounded-none shadow-2xl p-6 sm:p-8 border-x-0 border-t-0 sm:border border-slate-300 dark:border-slate-800 flex flex-col overflow-hidden ring-1 ring-black/5 dark:ring-white/5 animate-in slide-in-from-bottom-10 sm:slide-in-from-none duration-500`} onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between mb-8 shrink-0">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Ajustes</h3>
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em]">ZenTask Workspace v1.8.0</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-2xl transition-all active:scale-95 border border-slate-100 dark:border-slate-700/50">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar pb-2">

                    {/* Seção de Perfil */}
                    <div className="bg-slate-50/50 dark:bg-slate-800/30 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-10 -mt-10" />
                        <div className="flex items-center gap-4 relative">
                            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-[0_8px_16px_-4px_rgba(79,70,229,0.4)]">
                                {user.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-base font-black text-slate-800 dark:text-slate-100 truncate">{user.email?.split('@')[0]}</p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{user.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Navegação Mobile (v1.10.1) */}
                    <div className="space-y-3 sm:hidden">
                        <p className="px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Navegação</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => { setNavMode('dashboard'); onClose(); }}
                                className={`flex flex-col items-center justify-center p-4 rounded-3xl border transition-all active:scale-95 ${navMode === 'dashboard' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}
                            >
                                <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                <span className="text-[10px] font-black uppercase tracking-tight">Dashboard</span>
                            </button>
                            <button
                                onClick={() => { setNavMode('tasks'); onClose(); }}
                                className={`flex flex-col items-center justify-center p-4 rounded-3xl border transition-all active:scale-95 ${navMode === 'tasks' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}
                            >
                                <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" /></svg>
                                <span className="text-[10px] font-black uppercase tracking-tight">Fluxo Central</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Preferências</p>

                        <button
                            onClick={() => { onShowCategoryManager(); onClose(); }}
                            className="w-full flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800/40 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 border border-slate-200 dark:border-slate-800/80 group transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:scale-110 transition-transform shadow-inner">
                                    <svg className="w-5 h-5 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">Workspaces</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Personalizar fluxos e categorias</p>
                                </div>
                            </div>
                            <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                        </button>

                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className="w-full flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800/80 group transition-all active:scale-[0.98] shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-xl group-hover:rotate-12 transition-transform shadow-inner border border-slate-200 dark:border-slate-700/50">
                                    {darkMode ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                                    )}
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">Aparência</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold underline underline-offset-2 decoration-indigo-500/30">Tema {darkMode ? 'Claro' : 'Escuro'}</p>
                                </div>
                            </div>
                            <div className={`w-11 h-6 rounded-full relative transition-all duration-300 ring-1 ring-inset ring-black/5 dark:ring-white/10 ${darkMode ? 'bg-indigo-600 shadow-[0_0_15px_-3px_rgba(79,70,229,0.4)]' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ease-out ${darkMode ? 'left-6' : 'left-1'}`}>
                                    {darkMode && <div className="absolute inset-0 flex items-center justify-center"><div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse" /></div>}
                                </div>
                            </div>
                        </button>
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={() => setShowSupport(!showSupport)}
                            className="w-full text-center py-3 text-[11px] font-black text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                        >
                            {showSupport ? 'Ocultar Suporte Avançado' : 'Suporte Avançado'}
                            <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${showSupport ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                        </button>

                        {showSupport && (
                            <div className="mt-4 space-y-2.5 animate-in fade-in slide-in-from-top-4 duration-500">
                                <button
                                    onClick={onForceReloadCategories}
                                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 border border-slate-200/50 dark:border-slate-800/80 transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-black text-slate-800 dark:text-slate-200">Sincronizar Cloud</p>
                                            <p className="text-[10px] text-slate-500 font-bold">Atualizar estados remotos</p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={onForceResetCategories}
                                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 border border-slate-200/50 dark:border-slate-800/80 transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-indigo-100/50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-black text-slate-800 dark:text-slate-200">Reparo Estrutural</p>
                                            <p className="text-[10px] text-slate-500 font-bold">Validar integridade de dados</p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        if (window.confirm("🧹 Limpar Cache do Sistema? Isso forçará um recarregamento completo dos dados locais.")) {
                                            localStorage.clear();
                                            window.location.reload();
                                        }
                                    }}
                                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 hover:bg-rose-50 dark:hover:bg-rose-900/10 border border-slate-200/50 dark:border-slate-800/80 transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-rose-100/50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-black text-slate-800 dark:text-slate-200">Limpar Cache</p>
                                            <p className="text-[10px] text-slate-500 font-bold">Resolver falhas de interface</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>

                </div>

                {/* Botão de Sair (Logout) */}
                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
                    <button
                        onClick={() => {
                            if (window.confirm("Deseja realmente sair da sua conta?")) {
                                onLogout();
                                onClose();
                            }
                        }}
                        className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-rose-500/5 dark:bg-rose-500/10 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-rose-500/20 dark:border-rose-500/30 group transition-all active:scale-[0.98] shadow-sm hover:shadow-rose-500/5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl group-hover:scale-110 transition-transform shadow-sm border border-rose-100 dark:border-rose-500/30">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </div>
                            <div className="text-left">
                                <p className="text-base font-black text-rose-600 dark:text-rose-400">Sair da Sessão</p>
                                <p className="text-[10px] text-rose-500/60 dark:text-rose-400/50 font-bold uppercase tracking-wider">Encerrar acesso agora</p>
                            </div>
                        </div>
                        <svg className="w-5 h-5 text-rose-300 group-hover:text-rose-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;

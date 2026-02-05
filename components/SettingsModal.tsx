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
    setDarkMode
}) => {
    console.log("⚙️ SettingsModal v1.3.2 loaded");
    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 border border-slate-200 dark:border-slate-800 overflow-hidden" onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Configurações</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Versão 1.3.2 - UI Refinada</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">

                    {/* Seção de Perfil */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg">
                                {user.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{user.email?.split('@')[0]}</p>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{user.email}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Preferências</p>

                        <button
                            onClick={() => { onShowCategoryManager(); onClose(); }}
                            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-100 dark:border-slate-800/60 group transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:scale-110 transition-transform">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Personalizar Categorias</p>
                                    <p className="text-[10px] text-slate-500">Gerenciar workspaces e fluxos</p>
                                </div>
                            </div>
                            <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        </button>

                        <div className="opacity-40 grayscale pointer-events-none">
                            <button className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/60 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5a18.022 18.022 0 01-3.827 4.484l-1.428-1.428a16.516 16.516 0 003.546-3.753A17.95 17.95 0 0113 5h2m-4 12c-1.258 0-2.454-.305-3.5-.85" /></svg>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Idioma</p>
                                        <p className="text-[10px] text-slate-500">Português (BR)</p>
                                    </div>
                                </div>
                                <span className="text-[9px] font-black bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500 uppercase">Em Breve</span>
                            </button>
                        </div>

                        {/* Theme Toggle - Mobile optimized */}
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 border border-slate-100 dark:border-slate-800/60 group transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:rotate-12 transition-transform">
                                    {darkMode ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                                    )}
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Aparência</p>
                                    <p className="text-[10px] text-slate-500">Tema {darkMode ? 'Claro' : 'Escuro'}</p>
                                </div>
                            </div>
                            <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${darkMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${darkMode ? 'left-6' : 'left-1'}`}></div>
                            </div>
                        </button>
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={() => setShowSupport(!showSupport)}
                            className="w-full text-center py-2 text-[10px] font-black text-slate-400 hover:text-indigo-400 transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            {showSupport ? 'Ocultar Suporte Avançado' : 'Suporte Avançado'}
                            <svg className={`w-3 h-3 transition-transform ${showSupport ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                        </button>

                        {showSupport && (
                            <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <button
                                    onClick={onForceReloadCategories}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 group transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Sincronizar Dados</p>
                                            <p className="text-[10px] text-slate-500">Atualizar bibliotecas com o servidor</p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={onForceResetCategories}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Restaurar Padrões</p>
                                            <p className="text-[10px] text-slate-500">Reparo estrutural completo</p>
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
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-rose-50 dark:hover:bg-rose-900/20 group transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-lg">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Limpar Cache Local</p>
                                            <p className="text-[10px] text-slate-500">Resolver conflitos de interface</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>

                </div>

                {/* Botão de Sair (Logout) - Agora Fora da Área de Scroll, mas dentro do Modal */}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 shrink-0">
                    <button
                        onClick={() => {
                            if (window.confirm("Deseja realmente sair da sua conta?")) {
                                onLogout();
                                onClose();
                            }
                        }}
                        className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-900/10 hover:bg-rose-100 dark:hover:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 group transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl group-hover:scale-110 transition-transform">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">Sair da Conta</p>
                                <p className="text-[10px] text-rose-400/80">Encerrar sua sessão atual</p>
                            </div>
                        </div>
                        <svg className="w-4 h-4 text-rose-300 group-hover:text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;

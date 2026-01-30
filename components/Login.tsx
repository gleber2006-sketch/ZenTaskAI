import React, { useState } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '../services/firebase';

const Login: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao autenticar');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (err: any) {
            setError(err.message || 'Erro ao entrar com Google');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 selection:bg-indigo-500/30">
            <div className="max-w-[440px] w-full animate-in fade-in zoom-in-95 duration-700">
                {/* Logo/Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-2xl shadow-indigo-500/30 mb-6 group hover:rotate-6 transition-transform">
                        <svg className="w-10 h-10 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                        ZenTask <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">AI</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold tracking-tight mt-2 uppercase text-[10px] tracking-[0.3em]">Workspace de Alta Performance</p>
                </div>

                {/* Card */}
                <div className="glass-card rounded-[3rem] p-10 md:p-12 relative overflow-hidden transition-premium hover:shadow-2xl hover:shadow-indigo-500/10 border-white/40 dark:border-white/5">
                    <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-indigo-500 opacity-10 blur-[80px]"></div>
                    <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-40 h-40 bg-violet-500 opacity-10 blur-[80px]"></div>

                    <div className="relative z-10">
                        <div className="mb-8">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                {isLogin ? 'Welcome back' : 'Create space'}
                            </h2>
                            <p className="text-slate-400 dark:text-slate-500 text-xs font-bold mt-1">
                                {isLogin ? 'Entre para sincronizar seu workflow' : 'Comece sua jornada produtiva agora'}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 rounded-2xl border border-red-500/20 flex items-start text-red-500 dark:text-red-400 text-xs font-bold leading-relaxed">
                                <svg className="w-5 h-5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">E-mail</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-slate-100/50 dark:bg-slate-950/30 border border-transparent focus:border-indigo-500/30 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-400/50 shadow-inner"
                                    placeholder="seu@workflow.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">Senha</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-slate-100/50 dark:bg-slate-950/30 border border-transparent focus:border-indigo-500/30 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-400/50 shadow-inner"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-5 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-white/5 hover:scale-[1.02] active:scale-[0.98] transition-premium flex items-center justify-center uppercase tracking-widest text-xs"
                            >
                                {loading ? (
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    isLogin ? 'Acessar Workspace' : 'Configurar Conta'
                                )}
                            </button>
                        </form>

                        <div className="my-10 flex items-center">
                            <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-800"></div>
                            <span className="mx-6 text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em]">Cloud Connect</span>
                            <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-800"></div>
                        </div>

                        <button
                            onClick={handleGoogleLogin}
                            className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-black py-4.5 rounded-2xl transition-premium flex items-center justify-center space-x-4 shadow-sm"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span className="text-xs uppercase tracking-[0.1em]">Google SSO</span>
                        </button>

                        <div className="mt-10 text-center">
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest transition-colors"
                            >
                                {isLogin ? 'Need a new workspace? Sign up' : 'Already registered? Login here'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

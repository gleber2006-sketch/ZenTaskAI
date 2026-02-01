
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors">

            {/* Header / Brand */}
            <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-600 mb-4 shadow-sm shadow-indigo-500/20">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">ZenTask Pro</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Enterprise Productivity Suite</p>
            </div>

            {/* Main Card */}
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                <div className="p-8">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 text-center">
                        {isLogin ? 'Acesse sua conta' : 'Crie sua conta'}
                    </h2>

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-md border border-red-100 dark:border-red-800/50 flex items-center gap-2">
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email corporativo</label>
                            <input
                                type="email"
                                required
                                className="w-full border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm px-3 py-2 transition-colors"
                                placeholder="nome@empresa.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
                            <input
                                type="password"
                                required
                                className="w-full border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm px-3 py-2 transition-colors"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white font-medium py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors shadow-sm text-sm"
                        >
                            {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Cadastrar Conta')}
                        </button>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-2 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">Ou continue com</span>
                            </div>
                        </div>

                        <button
                            onClick={handleGoogleLogin}
                            className="mt-6 w-full flex items-center justify-center gap-3 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google Workspace
                        </button>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/50 px-8 py-4 border-t border-slate-200 dark:border-slate-800 text-center transition-colors">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {isLogin ? "Não tem uma conta?" : "Já possui acesso?"}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="ml-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium transition-colors"
                        >
                            {isLogin ? "Começar avaliação" : "Fazer login"}
                        </button>
                    </p>
                </div>
            </div>

            <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-600">
                <p>&copy; 2026 ZenTask Inc. Todos os direitos reservados.</p>
                <div className="flex justify-center gap-4 mt-2">
                    <a href="#" className="hover:text-slate-500 dark:hover:text-slate-500">Privacidade</a>
                    <a href="#" className="hover:text-slate-500 dark:hover:text-slate-500">Termos</a>
                    <a href="#" className="hover:text-slate-500 dark:hover:text-slate-500">Suporte</a>
                </div>
            </div>
        </div>
    );
};

export default Login;

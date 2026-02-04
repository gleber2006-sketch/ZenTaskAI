
import React, { useState, useEffect } from 'react';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { Task, Category, TaskStatus } from './types';
import Login from './components/Login';
import TaskItem from './components/TaskItem';
import CategoryManager from './components/CategoryManager';
import TaskForm from './components/TaskForm';
import { fetchCategories, forceResetCategories } from './services/categoryService';
import { fetchTasks, deleteTask, createTasksBulk, toggleTaskStatus } from './services/taskService';
import { processTaskCommand, FilePart } from './services/geminiService';
import { ActionType, AIResponse } from './types';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // UI State
  const [activeCategory, setActiveCategory] = useState<string | 'Tudo'>('Tudo');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'tasks' | 'ai' | 'settings'>('tasks');
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ file: File; base64: string; preview: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; text: string; hasFile?: boolean }[]>([
    { role: 'assistant', text: 'Sou seu assistente de tarefas com inteligência financeira integrada. Você pode digitar comandos ou anexar arquivos para criar fluxos completos.' }
  ]);
  const historyEndRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined' && localStorage.theme) return localStorage.theme === 'dark';
    if (typeof window !== 'undefined') return window.matchMedia('(prefers-color-scheme: dark)').matches;
    return false;
  });

  // Theme Logic
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [darkMode]);

  // Auth & Data Load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadData(currentUser.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadData = async (uid: string) => {
    try {
      setIsLoading(true);
      const [cats, userTasks] = await Promise.all([
        fetchCategories(uid),
        fetchTasks(uid)
      ]);
      setCategories(cats);
      setTasks(userTasks);

      console.log('✅ Dados carregados com sucesso.');
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  const forceReloadCategories = async () => {
    if (!user) return;
    try {
      console.log('🔄 Forçando reload de categorias...');
      const cats = await fetchCategories(user.uid);
      setCategories(cats);
      console.log('✅ Categorias carregadas:', cats.length);
      alert(`✅ ${cats.length} categorias carregadas com sucesso!`);
    } catch (error) {
      console.error('❌ Erro ao carregar categorias:', error);
      alert('❌ Erro ao carregar categorias. Veja o console para detalhes.');
    }
  };

  // Actions
  const handleTaskSaved = () => {
    if (user) loadData(user.uid);
  };

  const handleCreateTask = () => {
    setEditingTask(undefined);
    setShowTaskForm(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleToggleStatus = async (task: Task) => {
    try {
      await toggleTaskStatus(task);
      const newStatus: TaskStatus = task.status === 'concluida' ? 'pendente' : 'concluida';
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    } catch (e) { console.error("Erro ao alternar status:", e); }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      console.log(`🗑️ Excluindo tarefa: ${id}`);
      await deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
      console.log(`✅ Tarefa ${id} excluída.`);
    } catch (e) { console.error("Erro ao excluir tarefa:", e); }
  };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setSelectedFile({
        file,
        base64: base64String,
        preview: URL.createObjectURL(file)
      });
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedFile) || isLoading) return;

    const userMsg = input.trim();
    const fileData = selectedFile;

    setInput('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setHistory(prev => [...prev, {
      role: 'user',
      text: userMsg || (fileData ? `[Arquivo: ${fileData.file.name}]` : ""),
      hasFile: !!fileData
    }]);
    setIsLoading(true);

    let filePart: FilePart | undefined;
    if (fileData) {
      filePart = {
        mimeType: fileData.file.type,
        data: fileData.base64
      };
    }

    try {
      const response: AIResponse = await processTaskCommand(userMsg, tasks, filePart);

      if (response.action === ActionType.CREATE && response.createdTasks) {
        await createTasksBulk(user!.uid, response.createdTasks);
        loadData(user!.uid);
      } else if (response.action === ActionType.COMPLETE && response.id) {
        const t = tasks.find(t => t.id === response.id);
        if (t) await toggleTaskStatus(t);
        loadData(user!.uid);
      } else if (response.action === ActionType.DELETE && response.id) {
        await deleteTask(response.id);
        loadData(user!.uid);
      }

      setHistory(prev => [...prev, { role: 'assistant', text: response.message }]);
    } catch (error: any) {
      console.error("Erro ao processar comando:", error);
      setHistory(prev => [...prev, {
        role: 'assistant',
        text: `Ops, tive um problema técnico. Pode tentar de novo?`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.start();
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Filter Logic
  const filteredTasks = tasks.filter(t => {
    // Search
    if (searchTerm && !t.titulo.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    // Category
    if (activeCategory !== 'Tudo' && t.categoria_id !== activeCategory) return false;
    return true;
  });

  // Dashboard Metrics
  const pendingTasks = tasks.filter(t => t.status !== 'concluida');
  const completedTasks = tasks.filter(t => t.status === 'concluida');
  const inProgressTasks = tasks.filter(t => t.status === 'em_progresso');

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400 text-sm font-medium">Carregando ZenTask...</div>;
  if (!user) return <Login />;

  const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Configurações do Sistema
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-4 space-y-3">
          <button
            onClick={async () => {
              const { syncSystemSubcategories } = await import('./services/categoryService');
              const count = await syncSystemSubcategories(user!.uid);
              alert(count > 0 ? `✅ ${count} subcategorias sincronizadas!` : '✅ Sistema já atualizado.');
              loadData(user!.uid);
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Sincronizar Sistema</p>
                <p className="text-[10px] text-slate-500">Auto-healing de subcategorias</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>

          <button
            onClick={forceReloadCategories}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Recarregar Cache</p>
                <p className="text-[10px] text-slate-500">Atualizar categorias do servidor</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>

          <button
            onClick={async () => {
              if (window.confirm("🛠️ Estabilizar Sistema? Isso vai recuperar vínculos de tarefas e garantir que as categorias originais estejam corretas, SEM apagar seus dados.")) {
                setIsLoading(true);
                try {
                  await forceResetCategories(user!.uid);
                  await loadData(user!.uid);
                  alert("✅ Sistema estabilizado e categorias recuperadas!");
                } catch (e) {
                  console.error(e);
                  alert("❌ Falha na estabilização.");
                } finally {
                  setIsLoading(false);
                  onClose();
                }
              }
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Estabilizar Vínculos</p>
                <p className="text-[10px] text-slate-500">Reparo nuclear de dados</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>

          <button
            onClick={() => { setShowCategoryManager(true); onClose(); }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Categorias</p>
                <p className="text-[10px] text-slate-500">Gerenciar nomes e ícones</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">

      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 dark:bg-slate-950 text-white flex flex-col shrink-0 transition-all z-20 hidden md:flex border-r border-slate-800">
        {/* ... (Sidebar content remains same) ... */}
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-white/5 dark:border-slate-800 justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="font-bold tracking-tight text-white/90">ZenTask <span className="text-indigo-400">Pro</span></span>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all active:scale-95"
            title={darkMode ? "Modo Claro" : "Modo Escuro"}
          >
            {darkMode ? (
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium bg-slate-800 text-white rounded-md shadow-sm border border-slate-700/50">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
            Dashboard
          </button>
          <button onClick={() => setShowCategoryManager(true)} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            Workspaces
          </button>
        </nav>

        {/* Categories (Mini) */}
        <div className="px-6 py-6 border-t border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Categorias</p>
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
            <div
              className={`flex items-center gap-2 cursor-pointer group px-2 py-1.5 rounded-md transition ${activeCategory === 'Tudo' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              onClick={() => setActiveCategory('Tudo')}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              <span className="text-sm font-medium">Tudo</span>
            </div>
            {categories.filter(c => c.ativa).map(cat => (
              <div
                key={cat.id}
                className={`flex items-center gap-2 cursor-pointer group px-2 py-1.5 rounded-md transition ${activeCategory === cat.id ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                <span className="text-sm">{cat.icone}</span>
                <span className="text-sm font-medium truncate">{cat.nome}</span>
              </div>
            ))}
          </div>
        </div>

        {/* User */}
        <div className="p-4 border-t border-slate-800 mt-auto">
          <div className="flex items-center gap-3 px-2 py-2 cursor-pointer hover:bg-slate-800 rounded-md transition-colors" onClick={handleLogout}>
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{user.email?.split('@')[0]}</p>
              <p className="text-xs text-slate-500 truncate">Sair</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-0 md:gap-6 min-h-0 overflow-hidden pb-16 md:pb-0">

        {/* Left: Tasks Panel */}
        <section className={`lg:col-span-7 xl:col-span-8 flex flex-col min-h-0 bg-white dark:bg-slate-900 md:rounded-3xl shadow-md border-x md:border border-gray-200 dark:border-slate-800 overflow-hidden ${activeMobileTab === 'tasks' ? 'flex' : 'hidden md:flex'}`}>
          <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20 flex items-center justify-between shrink-0">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 flex items-center text-sm uppercase tracking-wider">
              <svg className="w-5 h-5 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Fluxo Central
            </h2>
            <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg">
              <button onClick={() => setViewMode('list')} className={`p-1 rounded-md transition ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
              </button>
              <button onClick={() => setViewMode('board')} className={`p-1 rounded-md transition ${viewMode === 'board' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM14 13a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
            <div className="mb-6 flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
              {['Tudo', ...categories.map(c => c.id)].map(catId => {
                const cat = categories.find(c => c.id === catId);
                const isSelected = activeCategory === catId;
                return (
                  <button
                    key={catId}
                    onClick={() => setActiveCategory(catId)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 border ${isSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 hover:border-indigo-200'
                      }`}
                  >
                    {cat ? `${cat.icone} ${cat.nome}` : 'Tudo'}
                  </button>
                );
              })}
            </div>

            {/* Quick Add Manual Task */}
            <div className="mb-6">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Adicionar tarefa rápida... (Enter)"
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      const title = e.currentTarget.value.trim();
                      e.currentTarget.value = '';
                      try {
                        console.log(`➕ Adicionando tarefa manual: ${title}`);
                        const { createTask } = await import('./services/taskService');
                        const result = await createTask(user!.uid, {
                          titulo: title,
                          categoria_id: activeCategory === 'Tudo' ? (categories[0]?.id || '') : activeCategory,
                          prioridade: 'media',
                          status: 'pendente'
                        });
                        console.log('✅ Tarefa salva no Firestore:', result.id);
                        loadData(user!.uid);
                      } catch (err) {
                        console.error('❌ Erro ao salvar tarefa manual:', err);
                        alert(`Erro ao salvar: ${err instanceof Error ? err.message : 'Verifique sua conexão'}`);
                      }
                    }
                  }}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                </div>
              </div>
            </div>

            {isLoading && filteredTasks.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-[60px] bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse border border-slate-200/50 dark:border-slate-700/30"></div>
                ))}
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-gray-100 dark:border-slate-700">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </div>
                <h3 className="font-semibold text-lg text-slate-400 dark:text-slate-600">Ambiente em paz</h3>
                <p className="text-xs mt-1">Nenhuma tarefa pendente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    categories={categories}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onToggleStatus={handleToggleStatus}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right: AI Chat Interface */}
        <section className={`lg:col-span-5 xl:col-span-4 flex flex-col min-h-0 bg-white dark:bg-slate-900 md:rounded-3xl shadow-md border-x md:border border-gray-200 dark:border-slate-800 overflow-hidden ${activeMobileTab === 'ai' ? 'flex' : 'hidden md:flex'}`}>
          <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20 flex items-center space-x-4 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">ZT</div>
            <div>
              <h2 className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-tight">Zen Assistant</h2>
              <div className="flex items-center">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-2"></span>
                <span className="text-[10px] text-gray-400 font-bold uppercase">Módulo IA</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-slate-50/30 dark:bg-[#0B1120]/30">
            {history.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-slate-700'
                  }`}>
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none border border-gray-100 dark:border-slate-700 flex items-center space-x-1 shadow-sm">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                </div>
              </div>
            )}
            <div ref={historyEndRef} />
          </div>

          <form onSubmit={handleCommand} className="p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 shrink-0">
            {selectedFile && (
              <div className="mb-3 flex items-center p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate">{selectedFile.file.name}</p>
                </div>
                <button type="button" onClick={removeFile} className="p-1 text-gray-400 hover:text-red-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}

            <div className="flex items-end space-x-2">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

              <div className="flex items-center space-x-1 mb-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg hover:bg-slate-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                </button>
                <button
                  type="button"
                  onClick={startVoiceInput}
                  className={`p-2 rounded-lg ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
              </div>

              <div className="relative flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleCommand(e as any);
                    }
                  }}
                  placeholder="Diga ou digite sua tarefa..."
                  className="w-full pl-4 pr-12 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm dark:text-white resize-none"
                  rows={1}
                  disabled={isLoading}
                />
                <button type="submit" disabled={isLoading} className="absolute right-2 bottom-1.5 p-1.5 bg-indigo-600 text-white rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </form>
        </section>
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 py-3 md:hidden z-50">
        <button
          onClick={() => setActiveMobileTab('tasks')}
          className={`flex flex-col items-center gap-1 transition-all ${activeMobileTab === 'tasks' ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-tight">Fluxo</span>
        </button>

        <button
          onClick={() => setActiveMobileTab('ai')}
          className={`flex flex-col items-center gap-1 transition-all ${activeMobileTab === 'ai' ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
        >
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border-2 transition-colors ${activeMobileTab === 'ai' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-transparent border-slate-300 dark:border-slate-700'}`}>ZT</div>
          <span className="text-[10px] font-bold uppercase tracking-tight">AI Chat</span>
        </button>

        <button
          onClick={() => setShowSettings(true)}
          className={`flex flex-col items-center gap-1 transition-all text-slate-400 hover:text-slate-600 dark:hover:text-slate-200`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-tight">Ajustes</span>
        </button>
      </nav>

      {/* Modals */}
      {showCategoryManager && user && (
        <CategoryManager userId={user.uid} onClose={() => setShowCategoryManager(false)} />
      )}
      {showTaskForm && user && (
        <TaskForm
          userId={user.uid}
          onClose={() => setShowTaskForm(false)}
          onSuccess={handleTaskSaved}
          existingTask={editingTask}
        />
      )}
      {showSettings && user && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

    </div>
  );
};

export default App;


import React, { useState, useEffect } from 'react';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { Task, Category, TaskStatus, TaskPriority } from './types';
import Login from './components/Login';
import TaskItem from './components/TaskItem';
import CategoryManager from './components/CategoryManager';
import TaskForm from './components/TaskForm';
import { fetchCategories, forceResetCategories } from './services/categoryService';
import { fetchTasks, deleteTask, deleteAllTasks, createTasksBulk, toggleTaskStatus, subscribeToTasks } from './services/taskService';
import { processTaskCommand, FilePart } from './services/geminiService';
import { ActionType, AIResponse } from './types';
import CurrentFocus from './components/CurrentFocus';
import SettingsModal from './components/SettingsModal';
import Sidebar from './components/Layout/Sidebar';
import SharedTaskLanding from './components/SharedTaskLanding';
import BoardView from './components/BoardView';
import CommandBar from './components/CommandBar';
import FilterModal from './components/FilterModal';
import DashboardView from './components/DashboardView';
import { Toaster, toast } from 'sonner';

const App: React.FC = () => {
  console.log("🚀 ZenTaskAI v1.3.9 - Premium UI Definition");

  // Routing Logic for Shared Tasks
  const [sharedTaskId, setSharedTaskId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('task');
  });

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
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'Tudo'>('Tudo');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'Tudo'>('Tudo');
  const [deadlineFilter, setDeadlineFilter] = useState<'Tudo' | 'recentes' | 'antigos' | 'custom'>('Tudo');
  const [customDate, setCustomDate] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [navMode, setNavMode] = useState<'tasks' | 'dashboard'>('tasks');
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ file: File; base64: string; preview: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [manualFocusTask, setManualFocusTask] = useState<Task | null>(null);
  const [isEfficiencyExpanded, setIsEfficiencyExpanded] = useState(false); // v1.15.1
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; text: string; hasFile?: boolean }[]>([
    { role: 'assistant', text: 'Sou seu assistente de tarefas com inteligência financeira integrada. Você pode digitar comandos ou anexar arquivos para criar fluxos completos.' }
  ]);
  const historyEndRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const prevTasksRef = React.useRef<Task[]>([]);
  const notifiedDeadlinesRef = React.useRef<Set<string>>(new Set());
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
        setTasks([]);
        setCategories([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadData = async (uid: string) => {
    try {
      setIsLoading(true);
      const cats = await fetchCategories(uid);
      setCategories(cats);
      console.log('✅ Categorias carregadas com sucesso.');
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  // Sincronização em tempo real das Tarefas (v1.8.1)
  useEffect(() => {
    if (!user) return;

    console.log("🔄 Iniciando sincronização em tempo real das tarefas...");
    const unsubscribe = subscribeToTasks(user.uid, (updatedTasks) => {
      // Check for Notifications (v1.9.0)
      updatedTasks.forEach(task => {
        const prevTask = prevTasksRef.current.find(t => t.id === task.id);

        // 1. External Completion Alert
        if (task.status === 'concluida' && prevTask && prevTask.status !== 'concluida' && task.metadata?.completed_by_external) {
          toast.success(`✓ ${task.metadata.external_completer_name || 'Alguém'} concluiu: ${task.titulo}`, {
            description: 'Tarefa atribuída foi finalizada.',
            duration: 8000,
          });
        }

        // 2. Deadline approaching alert (Within 24h)
        if (task.prazo && task.status !== 'concluida' && !notifiedDeadlinesRef.current.has(task.id)) {
          const deadlineDate = task.prazo.toDate ? task.prazo.toDate() : new Date((task.prazo.seconds || 0) * 1000);
          const now = new Date();
          const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

          if (diffHours > 0 && diffHours <= 24) {
            toast.warning(`⚡ Prazo Próximo: ${task.titulo}`, {
              description: `Vence em aproximadamente ${Math.round(diffHours)} horas.`,
              duration: 10000,
            });
            notifiedDeadlinesRef.current.add(task.id);
          }
        }
      });

      prevTasksRef.current = updatedTasks;
      setTasks(updatedTasks);
      setLoading(false);
    });

    return () => {
      console.log("🛑 Finalizando sincronização das tarefas.");
      unsubscribe();
    };
  }, [user]);

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

  const toggleGroup = (type: string) => {
    setCollapsedGroups(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleQuickAdd = async (title: string) => {
    if (!user) return;
    try {
      console.log(`➕ Adicionando tarefa rápida: ${title}`);
      const { createTask } = await import('./services/taskService');
      const result = await createTask(user.uid, {
        titulo: title,
        categoria_id: activeCategory === 'Tudo' ? (categories[0]?.id || '') : activeCategory,
        prioridade: 'media',
        status: 'pendente',
        tipo: 'tarefa'
      });
      console.log('✅ Tarefa salva no Firestore:', result.id);
      loadData(user.uid);
    } catch (err) {
      console.error('❌ Erro ao salvar tarefa rápida:', err);
      alert(`Erro ao salvar: ${err instanceof Error ? err.message : 'Verifique sua conexão'}`);
    }
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
        if (response.id === 'all') {
          await deleteAllTasks(user!.uid);
        } else if (response.id.startsWith('cat:')) {
          const catName = response.id.replace('cat:', '').trim();
          const cat = categories.find(c => c.nome.toLowerCase() === catName.toLowerCase());
          if (cat) await deleteAllTasks(user!.uid, { categoria_id: cat.id });
        } else if (response.id.startsWith('sub:')) {
          const subName = response.id.replace('sub:', '').trim();
          // Find subcategory across all categories for simplicity
          const { fetchSubcategories } = await import('./services/categoryService');
          let subId = null;
          for (const c of categories) {
            const subs = await fetchSubcategories(c.id);
            const matched = subs.find(s => s.nome.toLowerCase() === subName.toLowerCase());
            if (matched) { subId = matched.id; break; }
          }
          if (subId) await deleteAllTasks(user!.uid, { subcategoria_id: subId });
        } else {
          await deleteTask(response.id);
        }
        loadData(user!.uid);
      } else if ((response.action as string) === 'DELETE_ALL') {
        await deleteAllTasks(user!.uid);
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
    // Priority
    if (priorityFilter !== 'Tudo' && t.priority !== priorityFilter && t.prioridade !== priorityFilter) return false;

    // Deadline Custom Filter
    if (deadlineFilter === 'custom' && customDate) {
      if (!t.prazo) return false;
      const tDate = t.prazo.toDate ? t.prazo.toDate() : new Date(t.prazo.seconds * 1000);
      const filterDate = new Date(customDate + 'T00:00:00');
      if (tDate.toLocaleDateString() !== filterDate.toLocaleDateString()) return false;
    }

    return true;
  }).sort((a, b) => {
    // Apply Deadline Sorting if selected
    if (deadlineFilter === 'recentes') {
      if (!a.prazo && !b.prazo) return 0;
      if (!a.prazo) return 1;
      if (!b.prazo) return -1;
      const dateA = a.prazo.toDate ? a.prazo.toDate() : new Date(a.prazo.seconds * 1000);
      const dateB = b.prazo.toDate ? b.prazo.toDate() : new Date(b.prazo.seconds * 1000);
      return dateA.getTime() - dateB.getTime();
    }
    if (deadlineFilter === 'antigos') {
      if (!a.prazo && !b.prazo) return 0;
      if (!a.prazo) return 1;
      if (!b.prazo) return -1;
      const dateA = a.prazo.toDate ? a.prazo.toDate() : new Date(a.prazo.seconds * 1000);
      const dateB = b.prazo.toDate ? b.prazo.toDate() : new Date(b.prazo.seconds * 1000);
      return dateB.getTime() - dateA.getTime();
    }

    // Default Sorting (Order then Creation)
    const ordemA = a.ordem || 0;
    const ordemB = b.ordem || 0;
    if (ordemA !== ordemB) return ordemA - ordemB;

    const dataA = (a.criada_em as any)?.seconds || 0;
    const dataB = (b.criada_em as any)?.seconds || 0;
    return dataB - dataA;
  });

  // Dashboard Metrics
  const activeTasks = tasks.filter(t => t.status !== 'concluida');
  const finishedTasks = tasks.filter(t => t.status === 'concluida');
  const highPriorityTasks = tasks.filter(t => t.status !== 'concluida' && (t.prioridade === 'alta' || t.prioridade === 'critica'));

  const now = new Date();
  const next48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const upcomingTasks = tasks.filter(t => {
    if (!t.prazo || t.status === 'concluida') return false;
    const deadline = t.prazo.toDate ? t.prazo.toDate() : new Date(t.prazo.seconds * 1000);
    return deadline <= next48h && deadline >= now;
  });

  const completionRate = tasks.length > 0 ? Math.round((finishedTasks.length / tasks.length) * 100) : 0;

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400 text-sm font-medium">Carregando ZenTask...</div>;
  if (!user) return <Login />;

  // Grouping Logic
  const groupedTasks = filteredTasks.reduce((acc, t) => {
    const key = t.status === 'concluida' ? 'finalizada' : (t.tipo || 'tarefa');
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {} as Record<string, Task[]>);

  if (sharedTaskId) {
    return <SharedTaskLanding taskId={sharedTaskId} />;
  }

  const groupOrder: string[] = ['meta', 'rotina', 'evento', 'tarefa', 'finalizada'];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 text-[13px]">

      {/* SIDEBAR */}
      <Sidebar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        focusMode={focusMode}
        setFocusMode={setFocusMode}
        setShowCategoryManager={setShowCategoryManager}
        setShowSettings={setShowSettings}
        activeCategory={activeCategory}
        setActiveCategory={(cat) => {
          setActiveCategory(cat);
          setNavMode('tasks');
        }}
        categories={categories}
        user={user}
        onLogout={handleLogout}
        navMode={navMode}
        setNavMode={setNavMode}
      />

      <main className={`flex-1 flex flex-col ${focusMode ? 'lg:flex' : 'lg:grid lg:grid-cols-12'} gap-0 md:gap-6 min-h-0 overflow-hidden pb-16 md:pb-0 transition-all duration-500`}>

        {/* Left: Tasks Panel */}
        <section className={`${focusMode ? 'lg:col-span-12' : 'lg:col-span-7 xl:col-span-8'} flex flex-col min-h-0 bg-white dark:bg-slate-900 md:rounded-3xl shadow-md border-x md:border border-gray-200 dark:border-slate-800 overflow-hidden transition-all duration-500 ${activeMobileTab === 'tasks' ? 'flex' : 'hidden md:flex'} animate-in fade-in slide-in-from-left-4`}>
          <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20 flex items-center justify-between shrink-0">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 flex items-center text-sm uppercase tracking-wider">
              <svg className="w-5 h-5 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              {navMode === 'dashboard' ? 'Dashboard & Relatórios' : 'Fluxo Central'}
            </h2>
            <div className="flex items-center gap-4">
              {/* Eficiência Dinâmica (v1.15.1) */}
              <button
                onClick={() => setIsEfficiencyExpanded(!isEfficiencyExpanded)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 transition-all duration-500 active:scale-95`}
              >
                <svg className={`w-3.5 h-3.5 ${completionRate > 60 ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]' : completionRate > 30 ? 'text-yellow-500' : 'text-yellow-300 drop-shadow-[0_0_5px_rgba(253,224,71,0.8)]'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span className={`text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 transition-all duration-300 overflow-hidden ${isEfficiencyExpanded ? 'w-auto opacity-100 ml-1' : 'w-0 opacity-0 md:w-auto md:opacity-100 md:ml-0'}`}>
                  Eficiência
                </span>
                <span className={`text-[11px] font-black ${completionRate > 60 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : completionRate > 30 ? 'text-yellow-500' : 'text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]'}`}>
                  {completionRate}%
                </span>
              </button>

              <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg">
                <button onClick={() => { setViewMode('list'); setNavMode('tasks'); }} className={`p-1 rounded-md transition ${viewMode === 'list' && navMode === 'tasks' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                </button>
                <button onClick={() => { setViewMode('board'); setNavMode('tasks'); }} className={`p-1 rounded-md transition ${viewMode === 'board' && navMode === 'tasks' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM14 13a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                </button>
              </div>

              {/* Dark Mode Toggle (Mobile Only - Enhanced v1.15.1) */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="md:hidden flex items-center justify-center w-14 h-8 rounded-full bg-slate-200 dark:bg-slate-700 transition-all duration-300 relative shadow-inner hover:shadow-md active:scale-95"
                aria-label="Alternar Modo Escuro"
              >
                <div className={`absolute left-1 w-6 h-6 bg-white dark:bg-slate-800 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${darkMode ? 'translate-x-6' : 'translate-x-0'}`}>
                  {darkMode ? (
                    <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  )}
                </div>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
            {focusMode ? (
              <CurrentFocus
                topTask={manualFocusTask || undefined}
                tasks={filteredTasks}
                onSelectFocusTask={setManualFocusTask}
                onToggleStatus={handleToggleStatus}
                onExitFocus={() => {
                  setFocusMode(false);
                  setManualFocusTask(null);
                }}
              />
            ) : navMode === 'dashboard' ? (
              <DashboardView
                tasks={tasks}
                activeTasksCount={activeTasks.length}
                completionRate={completionRate}
                highPriorityCount={highPriorityTasks.length}
                upcomingCount={upcomingTasks.length}
              />
            ) : (
              <>

                <div className="mb-6 flex space-x-2 overflow-x-auto pb-2 no-scrollbar items-center">
                  {/* Botão de Filtro Mobile (Unificado) - Agora no início para visibilidade imediata */}
                  <button
                    onClick={() => setShowFilterModal(true)}
                    className="flex sm:hidden items-center gap-2 px-5 py-2 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest transition-all shrink-0 active:scale-95 shadow-lg shadow-indigo-600/20 mr-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                    Filtros
                  </button>

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

                {/* Sub-Filters: Status & Priority - Native Select - Visible only on Desktop (sm+) */}
                <div className="mb-6 hidden sm:flex flex-row gap-3">
                  {/* Status Select */}
                  <div className="relative flex-1">
                    <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/20 dark:border-slate-700/30">
                      <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                      <span className="uppercase tracking-widest text-[10px] text-slate-600 dark:text-slate-300 shrink-0">Status:</span>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                        className="flex-1 bg-transparent text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[10px] font-bold focus:outline-none cursor-pointer"
                      >
                        <option value="Tudo">Todos</option>
                        <option value="pendente">Pendente</option>
                        <option value="em_progresso">Em Progresso</option>
                        <option value="aguardando">Aguardando</option>
                        <option value="bloqueada">Bloqueada</option>
                        <option value="concluida">Concluída</option>
                      </select>
                    </div>
                  </div>

                  {/* Priority Select */}
                  <div className="relative flex-1">
                    <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/20 dark:border-slate-700/30">
                      <svg className="w-4 h-4 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
                      <span className="uppercase tracking-widest text-[10px] text-slate-600 dark:text-slate-300 shrink-0">Prioridade:</span>
                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}
                        className="flex-1 bg-transparent text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[10px] font-bold focus:outline-none cursor-pointer"
                      >
                        <option value="Tudo">Todas</option>
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                        <option value="critica">Crítica</option>
                      </select>
                    </div>
                  </div>

                  {/* Deadline Filter Select */}
                  <div className="relative flex-1">
                    <div className={`flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/40 p-2.5 rounded-xl border transition-all ${deadlineFilter !== 'Tudo' ? 'border-indigo-500/50' : 'border-slate-200/20 dark:border-slate-700/30'}`}>
                      <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <span className="uppercase tracking-widest text-[10px] text-slate-600 dark:text-slate-300 shrink-0">Prazo:</span>
                      <select
                        value={deadlineFilter}
                        onChange={(e) => setDeadlineFilter(e.target.value as typeof deadlineFilter)}
                        className="flex-1 bg-transparent text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[10px] font-bold focus:outline-none cursor-pointer"
                      >
                        <option value="Tudo">Qualquer</option>
                        <option value="recentes">Mais Próximos</option>
                        <option value="antigos">Mais Distantes</option>
                        <option value="custom">Escolher Dia...</option>
                      </select>
                    </div>
                    {deadlineFilter === 'custom' && (
                      <div className="absolute top-full left-0 right-0 mt-2 z-10 animate-in fade-in slide-in-from-top-1">
                        <input
                          type="date"
                          value={customDate}
                          onChange={(e) => setCustomDate(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-indigo-500/50 rounded-xl p-2 text-xs text-slate-700 dark:text-slate-200 shadow-xl focus:outline-none ring-2 ring-indigo-500/10"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Command Bar: Search & Quick Add (v1.5.0) */}
                <CommandBar
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  onQuickAdd={handleQuickAdd}
                  onManualAdd={handleCreateTask}
                />

                {
                  isLoading && filteredTasks.length === 0 ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-[60px] bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse border border-slate-200/50 dark:border-slate-700/30"></div>
                      ))}
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-500">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full"></div>
                        <div className="relative w-28 h-28 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-xl border border-slate-100 dark:border-slate-800 ring-1 ring-slate-200/50 dark:ring-slate-700/50">
                          <svg className="w-14 h-14 text-indigo-500/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      </div>
                      <h3 className="font-black text-xl text-slate-800 dark:text-white mb-2 tracking-tight">Produtividade Máxima</h3>
                      <p className="text-sm text-slate-400 max-w-[200px] leading-relaxed mx-auto">Você completou todos os objetivos desta visão. Hora de planejar o próximo passo.</p>
                      <div className="mt-8 flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={handleCreateTask}
                          className="px-6 py-2.5 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                          Nova Tarefa
                        </button>
                        <button
                          onClick={() => {
                            setActiveCategory('Tudo');
                            setStatusFilter('Tudo');
                            setPriorityFilter('Tudo');
                            setDeadlineFilter('Tudo');
                            setCustomDate('');
                            setSearchTerm('');
                          }}
                          className="px-6 py-2.5 bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                        >
                          Limpar Filtros
                        </button>
                      </div>
                    </div>
                  ) : viewMode === 'board' ? (
                    <BoardView
                      tasks={filteredTasks}
                      categories={categories}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      onToggleStatus={handleToggleStatus}
                      onUpdateTask={handleUpdateTask}
                    />
                  ) : (
                    <div className="space-y-8 pb-8">
                      {groupOrder.map(type => {
                        const group = groupedTasks[type];
                        if (!group || group.length === 0) return null;
                        return (
                          <div key={type} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div
                              className="flex items-center gap-4 mb-4 cursor-pointer select-none group/header"
                              onClick={() => toggleGroup(type)}
                            >
                              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 whitespace-nowrap group-hover/header:text-indigo-500 transition-colors">
                                {type === 'meta' && "🎯 Metas Estratégicas"}
                                {type === 'rotina' && "🔄 Rotinas"}
                                {type === 'evento' && "📅 Compromissos"}
                                {type === 'tarefa' && "⚡ Execução"}
                                {type === 'finalizada' && "✅ Finalizadas"}
                              </h3>
                              <div className="h-px bg-slate-100 dark:bg-slate-800/60 flex-1"></div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 bg-slate-100/50 dark:bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-200/20 dark:border-slate-700/30">
                                  {group.length}
                                </span>
                                <svg
                                  className={`w-3 h-3 text-slate-300 transition-transform duration-300 ${collapsedGroups.includes(type) ? '-rotate-90' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                            {!collapsedGroups.includes(type) && (
                              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                {group.map(task => (
                                  <TaskItem
                                    key={task.id}
                                    task={task}
                                    categories={categories}
                                    onEdit={handleEditTask}
                                    onDelete={handleDeleteTask}
                                    onToggleStatus={handleToggleStatus}
                                    onUpdateTask={handleUpdateTask}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
              </>
            )}
          </div>
        </section>

        {/* Right: AI Chat Interface */}
        {!focusMode && (
          <section className={`lg:col-span-5 xl:col-span-4 flex flex-col min-h-0 bg-white dark:bg-slate-900 md:rounded-3xl shadow-md border-x md:border border-gray-200 dark:border-slate-800 overflow-hidden ${activeMobileTab === 'ai' ? 'flex' : 'hidden md:flex'} animate-in fade-in slide-in-from-right-4`}>
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
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 py-3 md:hidden z-50">
        <button
          onClick={() => {
            setActiveMobileTab('tasks');
            setNavMode('tasks');
            setFocusMode(false);
          }}
          className={`flex flex-col items-center gap-1 transition-all ${activeMobileTab === 'tasks' && navMode === 'tasks' && !focusMode ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
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
          onClick={() => {
            setActiveMobileTab('tasks');
            setFocusMode(true);
          }}
          className={`flex flex-col items-center gap-1 transition-all ${activeMobileTab === 'tasks' && focusMode ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-tight">Foco</span>
        </button>

        <button
          onClick={() => {
            setActiveMobileTab('tasks');
            setNavMode('dashboard');
            setFocusMode(false);
          }}
          className={`flex flex-col items-center gap-1 transition-all ${activeMobileTab === 'tasks' && navMode === 'dashboard' && !focusMode ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-tight">Dashboard</span>
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
      {
        showCategoryManager && user && (
          <CategoryManager userId={user.uid} onClose={() => setShowCategoryManager(false)} />
        )
      }
      {
        showTaskForm && user && (
          <TaskForm
            userId={user.uid}
            onClose={() => setShowTaskForm(false)}
            onSuccess={handleTaskSaved}
            existingTask={editingTask}
          />
        )
      }
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
        onShowCategoryManager={() => setShowCategoryManager(true)}
        onForceReloadCategories={forceReloadCategories}
        onForceResetCategories={async () => {
          if (window.confirm("🛠️ Restaurar Padrões? Isso vai recuperar vínculos de tarefas e garantir a integridade dos fluxos originais.")) {
            setIsLoading(true);
            try {
              await forceResetCategories(user!.uid);
              await loadData(user!.uid);
              alert("✅ Sistema restaurado com sucesso!");
            } catch (e) {
              console.error(e);
              alert("❌ Falha na restauração.");
            } finally {
              setIsLoading(false);
            }
          }
        }}
        showSupport={showSupport}
        setShowSupport={setShowSupport}
        onLogout={handleLogout}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Modal de Filtros Mobile */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        deadlineFilter={deadlineFilter}
        setDeadlineFilter={setDeadlineFilter}
        customDate={customDate}
        setCustomDate={setCustomDate}
        onClear={() => {
          setStatusFilter('Tudo');
          setPriorityFilter('Tudo');
          setDeadlineFilter('Tudo');
          setCustomDate('');
        }}
      />

      <Toaster position="top-right" richColors expand={true} closeButton />
    </div >
  );
};

export default App;


import React, { useState, useEffect } from 'react';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { Task, Category, TaskStatus } from './types';
import Login from './components/Login';
import TaskItem from './components/TaskItem';
import CategoryManager from './components/CategoryManager';
import TaskForm from './components/TaskForm';
import { fetchCategories } from './services/categoryService';
import { fetchTasks, deleteTask } from './services/taskService';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // UI State
  const [activeCategory, setActiveCategory] = useState<string | 'Tudo'>('Tudo');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
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
      const [cats, userTasks] = await Promise.all([
        fetchCategories(uid),
        fetchTasks(uid)
      ]);
      setCategories(cats);
      setTasks(userTasks);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
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

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
    } catch (e) { console.error(e); }
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

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">

      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 dark:bg-slate-950 text-white flex flex-col shrink-0 transition-all z-20 hidden md:flex border-r border-slate-800">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="font-semibold tracking-tight text-lg text-slate-100">ZenTask Pro</span>
          </div>
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
            <button onClick={() => setShowCategoryManager(true)} className="text-slate-500 hover:text-white transition" title="Gerenciar Categorias">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
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

      {/* BODY */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-[#0B1120]">

        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 transition-colors z-10">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input
                type="text"
                placeholder="Pesquisar..."
                className="w-full bg-slate-100 dark:bg-slate-950 border-none rounded-md py-1.5 pl-9 pr-4 text-sm text-slate-900 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
          </div>
        </header>

        {/* Content Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

          {/* Welcome & Stats */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Visão Geral</h1>
              <button
                onClick={handleCreateTask}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm hover:shadow-md active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                Nova Tarefa
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pendentes</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">{pendingTasks.length}</span>
                  <span className="text-xs text-orange-500 font-medium mb-1">Para fazer</span>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Em Progresso</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">{inProgressTasks.length}</span>
                  <span className="text-xs text-amber-500 font-medium mb-1">Executando</span>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Concluídas</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">{completedTasks.length}</span>
                  <span className="text-xs text-emerald-500 font-medium mb-1">Finalizadas</span>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">{tasks.length}</span>
                  <span className="text-xs text-slate-400 font-medium mb-1">Tarefas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[400px] flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 rounded-t-xl">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  {activeCategory === 'Tudo' ? 'Todas as Tarefas' : categories.find(c => c.id === activeCategory)?.nome || 'Tarefas'}
                </h2>
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full">
                  {filteredTasks.length}
                </span>
              </div>

              <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg">
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                </button>
                <button onClick={() => setViewMode('board')} className={`p-1.5 rounded-md transition ${viewMode === 'board' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM14 13a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                </button>
              </div>
            </div>

            <div className="flex-1">
              {filteredTasks.length > 0 ? (
                <div>
                  {filteredTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      categories={categories}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      onToggleStatus={async (tsk) => {
                        // Optimistic
                        const newStatus = tsk.status === 'concluida' ? 'pendente' : 'concluida';
                        setTasks(prev => prev.map(t => t.id === tsk.id ? { ...t, status: newStatus } : t));
                        // Server
                        try {
                          const { updateTask } = await import('./services/taskService');
                          await updateTask(tsk.id, { status: newStatus });
                        } catch (e) {
                          console.error(e);
                          loadData(user?.uid || ''); // Revert
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  <p className="text-sm">Nenhuma tarefa nesta visualização.</p>
                  <button onClick={handleCreateTask} className="mt-4 text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                    Criar primeira tarefa
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

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

    </div>
  );
};

export default App;

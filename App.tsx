
import React, { useState, useEffect } from 'react';
import { db, auth } from './services/firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, where, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { Task, TaskCategory } from './types';
import Login from './components/Login';
import TaskItem from './components/TaskItem';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activeCategory, setActiveCategory] = useState<TaskCategory | 'Tudo'>('Tudo');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  // Load User
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load Tasks
  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    const q = query(collection(db, 'tasks'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(tasksData);
    });
    return () => unsubscribe();
  }, [user]);

  // Actions
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !user) return;

    await addDoc(collection(db, 'tasks'), {
      title: newTaskTitle,
      completed: false,
      userId: user.uid,
      createdAt: Timestamp.now(),
      status: 'Para Fazer',
      importance: 'média',
      category: activeCategory === 'Tudo' ? 'Trabalho' : activeCategory,
      pagamento: { status: 'Não aplicável', tipo: 'À vista' }
    });
    setNewTaskTitle('');
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      const newStatus = task.status === 'Concluída' ? 'Para Fazer' : 'Concluída';
      await updateDoc(doc(db, 'tasks', id), {
        status: newStatus,
        completed: !task.completed
      });
    }
  };

  const deleteTask = async (id: string) => {
    await deleteDoc(doc(db, 'tasks', id));
  };

  const updateTask = async (id: string, fields: Partial<Task>) => {
    await updateDoc(doc(db, 'tasks', id), fields);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Filtering
  const filteredTasks = tasks.filter(task => {
    const matchesCategory = activeCategory === 'Tudo' || task.category === activeCategory;
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const pendingTasks = tasks.filter(t => t.status !== 'Concluída');
  const completedTasks = tasks.filter(t => t.status === 'Concluída');

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400 text-sm font-medium">Carregando...</div>;
  if (!user) return <Login />;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">

      {/* SIDEBAR (Fixed) */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 transition-all z-20 hidden md:flex">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="font-semibold tracking-tight text-lg">ZenTask Pro</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium bg-slate-800 text-white rounded-md">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
            Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Meus Projetos
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Calendário
          </a>
        </nav>

        {/* Categories (Mini) */}
        <div className="px-6 py-6 border-t border-slate-800">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Workspaces</p>
          <div className="space-y-3">
            {(['Trabalho', 'Pessoal', 'Financeiro'] as const).map(cat => (
              <div key={cat} className="flex items-center gap-2 cursor-pointer group" onClick={() => setActiveCategory(cat)}>
                <div className={`w-2 h-2 rounded-full ${activeCategory === cat ? 'bg-indigo-500' : 'bg-slate-700 group-hover:bg-slate-500'}`}></div>
                <span className={`text-sm ${activeCategory === cat ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>{cat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* User */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 py-2 cursor-pointer hover:bg-slate-800 rounded-md transition-colors" onClick={handleLogout}>
            <img src={`https://ui-avatars.com/api/?name=${user.email}&background=334155&color=fff`} className="w-8 h-8 rounded-full bg-slate-700" alt="User" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.email?.split('@')[0]}</p>
              <p className="text-xs text-slate-500 truncate">Sair do sistema</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* TOPBAR */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0">
          {/* Mobile Menu Trigger (Visible only on small screens) */}
          <button className="md:hidden p-2 -ml-2 text-slate-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          {/* Global Search */}
          <div className="flex-1 max-w-xl mx-auto md:mx-0 relative">
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Buscar tarefas, projetos ou tags..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-md text-sm text-slate-900 dark:text-white focus:ring-0 placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 ml-4">
            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        {/* DASHBOARD SCROLL AREA */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">

          {/* HEADER AREA */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Visão Geral</h1>
              <p className="text-sm text-slate-500 mt-1">Bem-vindo de volta, aqui está o que está acontecendo hoje.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors">
                Exportar Relatório
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 shadow-sm transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                Novo Projeto
              </button>
            </div>
          </div>

          {/* METRICS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1 */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-500 uppercase">Tarefas Totais</span>
                <span className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-md">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{tasks.length}</span>
                <span className="text-xs font-medium text-emerald-600 mb-1">+12%</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-500 uppercase">Pendentes</span>
                <span className="p-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-md">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{pendingTasks.length}</span>
                <span className="text-xs font-medium text-slate-400 mb-1">items</span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-500 uppercase">Concluídas</span>
                <span className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-md">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{completedTasks.length}</span>
                <span className="text-xs font-medium text-emerald-600 mb-1">vs. ontem</span>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-500 uppercase">Financeiro (Previsto)</span>
                <span className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-md">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  R$ {pendingTasks.reduce((acc, t) => {
                    const val = parseFloat(t.value?.replace(/[^\d,]/g, '').replace(',', '.') || '0');
                    return acc + val;
                  }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>

          {/* MAIN LIST CONTAINER */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-[500px]">

            {/* List Toolbar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 rounded-t-lg">
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Tarefas Recentes</h2>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
                <div className="flex gap-1">
                  {/* View Toggles */}
                  <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                  </button>
                  <button onClick={() => setViewMode('board')} className={`p-1.5 rounded ${viewMode === 'board' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM14 13a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                  </button>
                </div>
              </div>

              {/* Add Task Input (Quick) */}
              <form onSubmit={handleAddTask} className="flex-1 max-w-md flex items-center gap-2 ml-4">
                <input
                  type="text"
                  placeholder="Adicionar nova tarefa... (Pressione Enter)"
                  className="flex-1 text-sm border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-indigo-500 py-1.5 px-3 bg-white dark:bg-slate-800"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
                <button type="submit" className="bg-indigo-600 text-white p-1.5 rounded-md hover:bg-indigo-700 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                </button>
              </form>
            </div>

            {/* Tasks Content */}
            <div className="p-4 flex-1">
              {filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  <p className="text-sm">Nenhuma tarefa encontrada.</p>
                  <p className="text-xs">Tente ajustar seus filtros ou criar uma nova tarefa.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={toggleTask}
                      onDelete={deleteTask}
                      onUpdate={updateTask}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;

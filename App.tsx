import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Task, ActionType, AIResponse, TaskOrigin, CreatedTaskData, TaskStatus, PaymentData, Installment, TaskCategory } from './types';
import { processTaskCommand, FilePart } from './services/geminiService';
import TaskItem from './components/TaskItem';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db, auth } from './services/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import Login from './components/Login';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zen-theme');
      return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const [selectedFile, setSelectedFile] = useState<{ file: File; base64: string; preview: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<TaskCategory | 'Tudo'>('Tudo');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; text: string; hasFile?: boolean }[]>([
    { role: 'assistant', text: 'Sou seu assistente de tarefas com inteligência financeira integrada. Você pode digitar comandos ou anexar arquivos para criar fluxos completos.' }
  ]);

  const historyEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  // Gestão de autenticação e Tema
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('zen-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('zen-theme', 'light');
    }

    return () => unsubscribe();
  }, [darkMode]);

  // Sincronização em tempo real com o Firestore (Isolada por Usuário)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid)
    );
    setIsSyncing(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Task[];
      setTasks(tasksData);
      setTimeout(() => setIsSyncing(false), 500); // Feedback visual curto
    }, (error) => {
      console.error("Erro na sincronização do Firestore:", error);
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addTasksBulk = useCallback(async (taskDataList: CreatedTaskData[], origin: TaskOrigin = 'texto') => {
    if (!user) return;
    const batch = writeBatch(db);

    taskDataList.forEach(data => {
      // Inicializa dados de pagamento
      const tipo = data.payment?.tipo || 'À vista';
      const totalParcelas = data.payment?.totalParcelas || 1;
      const parcelas: Installment[] = [];

      if (data.payment?.parcelas) {
        parcelas.push(...data.payment.parcelas);
      } else {
        for (let i = 1; i <= totalParcelas; i++) {
          parcelas.push({ numero: i, paga: data.payment?.status === 'Pago' });
        }
      }

      const pagamento: PaymentData = {
        status: data.payment?.status || (data.value ? 'Pendente' : 'Não aplicável'),
        tipo,
        totalParcelas,
        dataPagamento: data.payment?.dataPagamento || "",
        parcelas
      };

      const newTaskRef = doc(collection(db, 'tasks'));
      batch.set(newTaskRef, {
        userId: user.uid,
        title: data.title,
        category: data.category || 'Trabalho',
        description: data.description || "",
        client: data.client || "",
        service: data.service || "",
        contato: data.contato || "",
        empresa: data.empresa || "",
        tarefa: data.tarefa || "",
        value: data.value || "",
        recurrence: data.recurrence || false,
        importance: data.importance || "baixa",
        startDate: data.startDate || "",
        endDate: data.endDate || "",
        status: 'Para Fazer',
        origin,
        createdAt: new Date().toISOString(),
        pagamento,
        // Novos campos (Surpresa)
        local: data.local || "",
        humor: data.humor || "",
        participantes: data.participantes || "",
        bemEstar: data.bemEstar || "",
        briefing: data.briefing || "",
        linkArquivos: data.linkArquivos || "",
        prazoAprovação: data.prazoAprovação || "",
        fluxo: data.fluxo || "Entrada",
        tipoFinanceiro: data.tipoFinanceiro || "Fixo",
        comprovante: data.comprovante || "",
        materia: data.materia || "",
        topico: data.topico || "",
        linkAula: data.linkAula || "",
        dataRevisao: data.dataRevisao || "",
        milestone: data.milestone || "",
        stack: data.stack || "",
        repo: data.repo || "",
        sprint: data.sprint || ""
      });
    });

    await batch.commit();
  }, [user]);

  const toggleTask = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const taskRef = doc(db, 'tasks', id);
    setIsSyncing(true);
    await updateDoc(taskRef, {
      status: task.status === 'Concluída' ? 'Para Fazer' : 'Concluída'
    });
  }, [tasks]);

  const updateTask = useCallback(async (id: string, updatedFields: Partial<Task>) => {
    const taskRef = doc(db, 'tasks', id);
    // Removemos o ID dos campos para não tentar sobrescrevê-lo no Firestore
    const { id: _, ...fieldsToUpdate } = updatedFields as any;
    await updateDoc(taskRef, fieldsToUpdate);
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    setIsSyncing(true);
    const taskRef = doc(db, 'tasks', id);
    await deleteDoc(taskRef);
  }, []);

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
        await addTasksBulk(response.createdTasks, fileData ? 'anexo' : 'texto');
      } else if (response.action === ActionType.COMPLETE && response.id) {
        await toggleTask(response.id);
      } else if (response.action === ActionType.DELETE && response.id) {
        await deleteTask(response.id);
      }

      setHistory(prev => [...prev, { role: 'assistant', text: response.message }]);
    } catch (error: any) {
      console.error("Erro ao processar comando:", error);
      const errorDetail = error?.message || "Erro desconhecido";
      setHistory(prev => [...prev, {
        role: 'assistant',
        text: `Falha técnica detectada: ${errorDetail}. Por favor, verifique sua conexão e tente novamente.`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      // Auto-submit opcional pode ser adicionado aqui
    };

    recognition.start();
  };

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (activeCategory !== 'Tudo') {
      list = tasks.filter(t => (t.category || 'Trabalho') === activeCategory);
    }

    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(lowerSearch) ||
        (t.description || '').toLowerCase().includes(lowerSearch) ||
        (t.contato || '').toLowerCase().includes(lowerSearch) ||
        (t.empresa || '').toLowerCase().includes(lowerSearch)
      );
    }

    // Ordenação no cliente para evitar problemas de índices compostos no Firestore
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tasks, activeCategory, searchTerm]);

  const pendingTasks = filteredTasks.filter(t => t.status !== 'Concluída');
  const completedTasks = filteredTasks.filter(t => t.status === 'Concluída');

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f172a] text-indigo-600">
        <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className={`flex h-[100dvh] transition-colors duration-500 ${darkMode ? 'dark bg-[#020617]' : 'bg-[#f8fafc]'} overflow-hidden font-['Manrope']`}>

      {/* Sidebar Minimalista (Concept Style) */}
      <aside className="hidden md:flex flex-col w-20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border-r border-gray-200 dark:border-slate-800 transition-all items-center py-8 shrink-0 z-20">
        <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20 mb-10 group cursor-pointer hover:rotate-6 transition-transform">
          <svg className="w-7 h-7 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <nav className="flex flex-col gap-6 flex-1">
          <button
            onClick={() => { setActiveCategory('Tudo'); setSearchTerm(''); }}
            className={`p-3 rounded-2xl shadow-inner border transition-premium relative group ${activeCategory === 'Tudo' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800' : 'text-gray-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-slate-800 border-transparent'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">Dashboard</div>
          </button>
          <button className="p-3 text-gray-400 hover:text-indigo-500 transition-premium hover:bg-white dark:hover:bg-slate-800 rounded-2xl relative group">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">Calendário</div>
          </button>
          <button
            onClick={() => setActiveCategory('Financeiro')}
            className={`p-3 rounded-2xl transition-premium relative group ${activeCategory === 'Financeiro' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800' : 'text-gray-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-slate-800 border-transparent'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">Financeiro</div>
          </button>
        </nav>

        <div className="flex flex-col gap-4 mt-auto">
          <button onClick={() => setDarkMode(!darkMode)} className="p-3 text-gray-400 hover:text-amber-500 transition-premium hover:bg-white dark:hover:bg-slate-800 rounded-2xl">
            {darkMode ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
          </button>
          <button onClick={() => signOut(auth)} className="p-3 text-gray-400 hover:text-red-500 transition-premium hover:bg-white dark:hover:bg-slate-800 rounded-2xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">

        {/* Header Glass / Bento Stats */}
        <header className="px-6 md:px-10 py-6 md:py-8 shrink-0">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-4xl font-black text-black dark:text-white tracking-tighter flex items-center gap-3">
                ZenTask <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-violet-600 to-emerald-500 dark:from-indigo-400 dark:via-violet-400 dark:to-emerald-400">AI</span>
                {isSyncing && <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>}
              </h2>
              <p className="text-slate-700 dark:text-slate-400 font-bold tracking-tight flex items-center gap-2">
                <span className="opacity-100">{user.email}</span>
                <span className="w-1.5 h-1.5 bg-slate-500 dark:bg-slate-700 rounded-full"></span>
                <span className="text-indigo-700 dark:text-indigo-400 font-black uppercase text-[10px] tracking-[0.25em]">{pendingTasks.length} frentes ativas hoje</span>
              </p>
            </div>

            {/* Bento Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white/95 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 flex flex-col justify-between shadow-xl shadow-slate-300/20 dark:shadow-none transition-premium group hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em]">Performance</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{Math.round((completedTasks.length / (tasks.length || 1)) * 100)}%</span>
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Done</span>
                </div>
              </div>

              <div className="bg-white/95 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 flex flex-col justify-between shadow-xl shadow-slate-300/20 dark:shadow-none transition-premium group hover:scale-[1.02]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em]">Pendente</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{pendingTasks.length}</span>
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Tasks</span>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border border-indigo-100 dark:border-white/5 rounded-3xl p-6 flex flex-col justify-between shadow-xl shadow-indigo-100/50 dark:shadow-none transition-premium group hover:scale-[1.02] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <svg className="w-12 h-12 text-indigo-500 rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">Forecast</span>
                  </div>
                  <div className="flex items-baseline gap-2 text-indigo-600 dark:text-indigo-400">
                    <span className="text-4xl font-black tracking-tighter">R$ {pendingTasks.reduce((acc, t) => {
                      const val = parseFloat(t.value?.replace(/[^\d,]/g, '').replace(',', '.') || '0');
                      return acc + val;
                    }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content Area (Bento Split) */}
        <div className="flex-1 px-6 md:px-10 pb-10 flex flex-col lg:flex-row gap-8 min-h-0 overflow-hidden">

          {/* Main List Section */}
          <section className="flex-1 glass-card rounded-[3rem] flex flex-col overflow-hidden shadow-2xl shadow-indigo-500/5 relative group border-white/20 dark:border-white/5">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent pointer-events-none"></div>

            {/* List Header / Search */}
            <div className="p-8 pb-4 flex flex-col gap-8 shrink-0 z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-sm font-black text-black dark:text-white tracking-[0.2em] flex items-center gap-4 uppercase mb-2">
                  <span className="w-1 h-8 bg-indigo-700 dark:bg-indigo-500 rounded-full"></span>
                  Fluxo de Trabalho
                </h3>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth p-1 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-white/5">
                {(['Tudo', 'Pessoal', 'Trabalho', 'Financeiro', 'Projetos'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-premium ${activeCategory === cat
                      ? 'bg-slate-900 dark:bg-slate-800 text-white dark:text-white shadow-xl border border-slate-900 dark:border-white/10'
                      : 'text-slate-600 dark:text-slate-400 hover:text-indigo-700 hover:bg-slate-100 font-bold transition-all'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative group/search">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within/search:text-indigo-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input
                type="text"
                placeholder="Master Search: Digite qualquer coisa para filtrar seu workspace..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-4.5 bg-white/90 dark:bg-slate-950/20 border border-slate-200 dark:border-transparent focus:border-indigo-500/50 rounded-[1.5rem] text-sm font-bold transition-premium placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 outline-none backdrop-blur-md shadow-inner text-slate-900 dark:text-white"
              />
            </div>

            {/* Task Area Scroller */}
            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
              {filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-20 opacity-60 animate-in fade-in duration-1000">
                  <div className="w-24 h-24 bg-slate-200/50 dark:bg-slate-800/80 rounded-[2.5rem] flex items-center justify-center mb-8 rotate-12">
                    <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  </div>
                  <h3 className="text-2xl font-black text-slate-600 dark:text-slate-300 tracking-tighter uppercase">Zen Space</h3>
                  <p className="text-sm mt-3 max-w-[220px] font-bold leading-relaxed text-slate-500 dark:text-slate-400">Tudo sob controle. Seu workspace está limpo e organizado.</p>
                </div>
              ) : (
                <div className="space-y-10 pt-4">
                  {pendingTasks.length > 0 && (
                    <div>
                      <h4 className="flex items-center gap-4 text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] mb-6">
                        <span className="shrink-0">Prioridades Ativas</span>
                        <span className="flex-1 h-[1px] bg-gradient-to-r from-indigo-500/20 to-transparent"></span>
                      </h4>
                      <div className="space-y-4">
                        {pendingTasks.map(task => (
                          <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask} />
                        ))}
                      </div>
                    </div>
                  )}
                  {completedTasks.length > 0 && (
                    <div className="opacity-40 grayscale transition-all duration-700 hover:opacity-100 hover:grayscale-0">
                      <h4 className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-6">
                        <span className="shrink-0">Arquivo de Conclusão</span>
                        <span className="flex-1 h-[1px] bg-gradient-to-r from-slate-400/20 to-transparent"></span>
                      </h4>
                      <div className="space-y-4">
                        {completedTasks.map(task => (
                          <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onUpdate={updateTask} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Assistant Panel (Concept Integration) */}
          <section className="w-full lg:w-[400px] xl:w-[440px] flex flex-col gap-6 shrink-0 relative">
            <div className="flex-1 glass-card rounded-[3rem] flex flex-col overflow-hidden relative shadow-2xl shadow-indigo-900/10 border-white/20 dark:border-white/5">
              <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/[0.03] to-transparent pointer-events-none"></div>

              <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <div className="w-14 h-14 rounded-[1.5rem] bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 font-black text-xl shadow-2xl group-hover:rotate-6 transition-transform">AI</div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-900 shadow-lg"></div>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-[0.2em]">Zen Neural</h3>
                    <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-0.5">Active Core v2.4</p>
                  </div>
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar scroll-smooth">
                {history.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-500`}>
                    <div className={`max-w-[90%] px-6 py-5 rounded-[2rem] text-sm leading-relaxed font-bold ${msg.role === 'user'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-tr-none shadow-2xl shadow-slate-900/20'
                      : 'bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-white/5 backdrop-blur-md shadow-lg'
                      }`}>
                      {msg.hasFile && (
                        <div className="flex items-center gap-2 mb-4 p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl text-[9px] font-black uppercase tracking-widest border border-indigo-500/20">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          Inteligência de Dados Ativa
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/30 dark:bg-slate-800/30 px-8 py-5 rounded-[2rem] rounded-tl-none border border-transparent flex items-center gap-2 backdrop-blur-sm">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                )}
                <div ref={historyEndRef} />
              </div>

              {/* Command Input Area */}
              <div className="p-8 pt-4 bg-gradient-to-t from-white dark:from-slate-950/20 to-transparent">
                <form onSubmit={handleCommand} className="relative group/form">
                  {selectedFile && (
                    <div className="absolute bottom-full left-0 right-0 mb-6 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[1.5rem] border border-indigo-500/20 shadow-2xl flex items-center animate-in slide-in-from-bottom-4 transition-premium">
                      <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mr-4 shadow-inner">
                        <svg className="w-7 h-7 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-slate-800 dark:text-white truncate uppercase tracking-tight">{selectedFile.file.name}</p>
                        <p className="text-[9px] text-indigo-500 font-black tracking-[0.2em] mt-0.5">SYNCED & READY</p>
                      </div>
                      <button type="button" onClick={removeFile} className="p-2 text-slate-300 hover:text-red-500 transition-premium hover:rotate-90">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  )}

                  <div className="relative">
                    <textarea
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (input.trim() || selectedFile) handleCommand(e as any);
                        }
                      }}
                      placeholder="Brainstorm with Zen AI..."
                      className="w-full pl-8 pr-24 py-6 bg-white dark:bg-slate-900/80 border border-transparent focus:border-indigo-500/20 rounded-[2.5rem] text-sm font-bold transition-premium placeholder:text-slate-500 outline-none shadow-2xl shadow-indigo-900/10 resize-none custom-scrollbar min-h-[0px] leading-relaxed block backdrop-blur-md text-black dark:text-white"
                      rows={2}
                      disabled={isLoading}
                    />

                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-premium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                      </button>
                      <button type="submit" disabled={isLoading || (!input.trim() && !selectedFile)} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 rounded-[1.25rem] hover:scale-110 active:scale-90 transition-premium disabled:opacity-30 disabled:hover:scale-100 shadow-2xl shadow-indigo-500/20">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </section>
        </div>
      </main >

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf,text/plain" />
    </div >
  );
};

export default App;

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
    <div className={`flex flex-col h-[100dvh] max-w-6xl mx-auto px-4 py-2 md:py-8 md:px-6 transition-colors duration-300 ${darkMode ? 'dark bg-[#0f172a] text-white' : 'bg-slate-50 text-gray-900'} overflow-hidden`}>
      {/* Dashboard Header Compacto */}
      <div className="flex items-center justify-between mb-4 md:mb-8 gap-2 shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none shrink-0">
            <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <h1 className="text-lg md:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none truncate">ZenTask <span className="text-indigo-600">AI</span></h1>
              <div className="bg-indigo-50 dark:bg-indigo-900/30 px-2 md:px-3 py-0.5 md:py-1 rounded-full border border-indigo-200 dark:border-indigo-800 flex items-center shadow-md">
                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-indigo-500'}`}></span>
                <span className="text-[8px] md:text-[10px] font-bold text-indigo-700 dark:text-indigo-400">
                  {isSyncing ? 'SINCRONIZANDO...' : `${pendingTasks.length} ATIVAS`}
                </span>
              </div>
            </div>
            <p className="hidden xs:block text-[9px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-1 truncate">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <div className="relative group mr-2 hidden sm:block">
            {isSyncing ? (
              <svg className="w-5 h-5 text-amber-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            )}
            <div className="absolute top-10 right-0 bg-white dark:bg-slate-800 px-2 py-1 rounded text-[8px] font-bold border border-gray-100 dark:border-slate-700 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              CUIDADO: {isSyncing ? 'Sincronizando' : 'Dados Salvos'}
            </div>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 md:p-3 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-400 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-md"
            title={darkMode ? "Luz" : "Escuro"}
          >
            {darkMode ? (
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => signOut(auth)}
            className="p-2 md:p-3 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all shadow-sm group"
            title="Sair"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>



      <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-4 md:gap-6 min-h-0 overflow-hidden">

        {/* Left: Tasks Panel */}
        <section className="lg:col-span-7 xl:col-span-7.5 flex flex-col flex-1 lg:flex-none lg:h-full min-h-0 bg-white dark:bg-slate-900 rounded-3xl shadow-md border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20 flex items-center justify-between shrink-0">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 flex items-center text-sm uppercase tracking-wider">
              <svg className="w-5 h-5 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Fluxo Central
            </h2>
            <span className="hidden sm:inline-block text-[9px] text-gray-400 font-black uppercase tracking-[0.2em]">Gestão Operacional</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
            <div className="mb-6 relative">
              <input
                type="text"
                placeholder="Buscar em tarefas, notas, empresas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-slate-800 border-none rounded-2xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-400"
              />
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="mb-6 flex space-x-2 overflow-x-auto pb-4 custom-scrollbar no-scrollbar-at-mobile">
              {(['Tudo', 'Pessoal', 'Trabalho', 'Clientes', 'Financeiro', 'Estudos', 'Projetos'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 border ${activeCategory === cat
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none'
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-gray-500 hover:border-indigo-200 dark:hover:border-indigo-900 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-gray-100 dark:border-slate-700">
                  <svg className="w-8 h-8 text-gray-200 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-gray-400 dark:text-gray-500 font-semibold text-lg">Pronto para processar</h3>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2 max-w-xs mx-auto">Diga sua demanda ou anexe arquivos para o Assistant.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingTasks.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 ml-1">Atividades Prioritárias</h3>
                    {pendingTasks.map(task => (
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

                {completedTasks.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4 ml-1">Concluídas</h3>
                    {completedTasks.map(task => (
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
            )}
          </div>
        </section>

        {/* Right: AI Chat Interface */}
        <section className="lg:col-span-5 xl:col-span-4.5 flex flex-col flex-1 lg:flex-none lg:h-full min-h-0 bg-white dark:bg-slate-900 rounded-3xl shadow-md border border-gray-200 dark:border-slate-800 overflow-hidden mt-0 sm:mt-2 lg:mt-0">
          <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20 flex items-center space-x-4 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-indigo-200 dark:shadow-none shadow-lg shrink-0">ZT</div>
            <div>
              <h2 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Zen Assistant</h2>
              <div className="flex items-center">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-2"></span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Módulo de IA Ativo</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-transparent">
            {history.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`w-full px-5 py-4 rounded-3xl text-sm md:text-base leading-relaxed shadow-sm ${msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-slate-700'
                  }`}>
                  {msg.hasFile && (
                    <div className="flex items-center mb-3 p-2.5 bg-indigo-500/20 text-indigo-600 rounded-2xl text-[10px] border border-indigo-400/30 font-bold">
                      <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      Extração financeira realizada
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 px-5 py-4 rounded-3xl rounded-tl-none border border-gray-100 dark:border-slate-700 flex items-center space-x-1.5 shadow-sm">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                </div>
              </div>
            )}
            <div ref={historyEndRef} />
          </div>

          <form onSubmit={handleCommand} className="p-3 md:p-5 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 shrink-0 shadow-inner">
            {selectedFile && (
              <div className="mb-4 flex items-center p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 shadow-sm animate-in fade-in zoom-in-95">
                {selectedFile.file.type.startsWith('image/') ? (
                  <img src={selectedFile.preview} alt="Preview" className="w-12 h-12 object-cover rounded-xl mr-4 border border-indigo-100 shadow-sm" />
                ) : (
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-gray-800 truncate">{selectedFile.file.name}</p>
                  <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Aguardando envio</p>
                </div>
                <button type="button" onClick={removeFile} className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-white rounded-full shadow-sm border border-gray-100 ml-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <div className="flex items-end space-x-2">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf,text/plain" />

              <div className="flex items-center space-x-1.5 pb-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2.5 rounded-xl border transition-all ${selectedFile ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 hover:bg-gray-100 hover:text-indigo-600'}`}
                  title="Anexar arquivo"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={startVoiceInput}
                  className={`p-2.5 rounded-xl border transition-all ${isListening ? 'bg-red-500 border-red-500 text-white animate-pulse shadow-lg' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 hover:bg-gray-100 hover:text-indigo-600'}`}
                  title="Falar comando"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              </div>

              <div className="relative flex-1">
                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim() || selectedFile) handleCommand(e as any);
                    }
                  }}
                  placeholder={selectedFile ? "Comando para o anexo..." : "Diga ou digite sua tarefa..."}
                  className="w-full pl-5 pr-14 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-700 text-sm md:text-base text-gray-900 dark:text-white transition-all shadow-inner placeholder:text-gray-400 resize-none custom-scrollbar overflow-y-auto block"
                  rows={2}
                  style={{ minHeight: '80px', maxHeight: '200px' }}
                  disabled={isLoading}
                />
                <button type="submit" disabled={isLoading || (!input.trim() && !selectedFile)} className="absolute right-2 bottom-2 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-slate-800 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-100 dark:shadow-none">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </form>
        </section>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${darkMode ? '#1e293b' : '#f1f5f9'}; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${darkMode ? '#334155' : '#e2e8f0'}; }
      `}</style>
    </div>
  );
};

export default App;

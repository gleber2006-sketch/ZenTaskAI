
import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, ImportanceLevel, PaymentData, PaymentStatus, PaymentType, Installment, Attachment, TaskCategory } from '../types';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, fields: Partial<Task>) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Task>(task);
  const [isUploading, setIsUploading] = useState(false);
  const isCompleted = task.status === 'Concluída';

  useEffect(() => {
    setEditData(task);
  }, [task]);

  const ImportanceBadge = ({ level }: { level?: string }) => {
    if (!level) return null;
    const colors = {
      alta: 'bg-red-500/10 text-red-500 border-red-500/20',
      média: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      baixa: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
    };
    return (
      <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border backdrop-blur-md ${colors[level as keyof typeof colors]}`}>
        {level}
      </span>
    );
  };

  const StatusBadge = ({ status }: { status: TaskStatus }) => {
    const colors = {
      'Para Fazer': 'text-amber-500',
      'Em Andamento': 'text-indigo-500',
      'Aguardando': 'text-violet-500',
      'Concluída': 'text-emerald-500'
    };
    return (
      <span className={`text-[9px] font-black uppercase tracking-tighter ${colors[status]}`}>
        {status}
      </span>
    );
  };

  const CategoryBadge = ({ category }: { category: TaskCategory }) => {
    const colors = {
      'Pessoal': 'bg-sky-500/10 text-sky-500 border-sky-500/20',
      'Trabalho': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      'Clientes': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      'Financeiro': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      'Estudos': 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      'Projetos': 'bg-slate-500/10 text-slate-500 border-slate-500/20'
    };
    return (
      <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border backdrop-blur-md ${colors[category] || colors['Trabalho']}`}>
        {category || 'Trabalho'}
      </span>
    );
  };

  const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => {
    const colors = {
      'Não aplicável': 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400',
      'Pendente': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'Pago': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    };
    return (
      <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${colors[status]}`}>
        {status}
      </span>
    );
  };

  const handleSave = () => {
    onUpdate(task.id, editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData(task);
    setIsEditing(false);
  };

  const handleChange = (field: keyof Task, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handlePaymentChange = (field: keyof PaymentData, value: any) => {
    const currentPayment = editData.pagamento || {
      status: 'Não aplicável',
      tipo: 'À vista',
      totalParcelas: 1,
      parcelas: [{ numero: 1, paga: false }]
    };

    let newPayment = { ...currentPayment, [field]: value };

    if (field === 'tipo') {
      if (value === 'À vista') {
        newPayment.totalParcelas = 1;
        newPayment.parcelas = [{ numero: 1, paga: currentPayment.parcelas[0]?.paga || false }];
      } else {
        if (newPayment.totalParcelas < 1) newPayment.totalParcelas = 1;
      }
    }

    if (field === 'totalParcelas') {
      const num = Math.min(10, Math.max(1, value));
      newPayment.totalParcelas = num;
      const existing = [...currentPayment.parcelas];
      const nextParcelas: Installment[] = [];
      for (let i = 1; i <= num; i++) {
        const found = existing.find(p => p.numero === i);
        nextParcelas.push(found || { numero: i, paga: false });
      }
      newPayment.parcelas = nextParcelas;
    }

    if (newPayment.status !== 'Não aplicável') {
      const allPaid = newPayment.parcelas.every(p => p.paga);
      newPayment.status = allPaid ? 'Pago' : 'Pendente';
    }

    setEditData(prev => ({ ...prev, pagamento: newPayment }));
  };

  const toggleInstallment = (index: number) => {
    if (!editData.pagamento) return;
    const newParcelas = [...editData.pagamento.parcelas];
    newParcelas[index].paga = !newParcelas[index].paga;

    const allPaid = newParcelas.every(p => p.paga);
    const newStatus = allPaid ? 'Pago' : 'Pendente';

    setEditData(prev => ({
      ...prev,
      pagamento: {
        ...prev.pagamento!,
        parcelas: newParcelas,
        status: editData.pagamento?.status === 'Não aplicável' ? 'Não aplicável' : newStatus
      }
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `attachments/${task.id}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);

      const newAttachment: Attachment = {
        name: file.name,
        url: url,
        type: file.type,
        createdAt: new Date().toISOString()
      };

      const updatedAttachments = [...(task.attachments || []), newAttachment];
      onUpdate(task.id, { attachments: updatedAttachments });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      alert("Erro ao enviar arquivo. Tente novamente.");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const isPaymentModuleActive = task.pagamento?.status !== 'Não aplicável' || !!task.value || !!task.client || !!task.contato || !!task.empresa;

  return (
    <div className={`group mb-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border rounded-[2rem] transition-all hover:scale-[1.01] hover:shadow-2xl hover:shadow-indigo-500/10 ${isCompleted ? 'border-emerald-200/50 dark:border-emerald-500/20' : 'border-gray-100 dark:border-white/5'}`}>
      {/* Header / Clickable area */}
      <div
        className="flex items-center justify-between p-5 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-5 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(task.id);
            }}
            className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${isCompleted
              ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-indigo-500'
              }`}
          >
            {isCompleted && (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {isEditing ? (
                <input
                  autoFocus
                  className="text-sm font-bold bg-white/80 dark:bg-slate-800/80 border border-indigo-500/30 rounded-xl px-3 py-1 outline-none shadow-sm"
                  value={editData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span className={`text-sm font-black tracking-tight truncate ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`}>
                    {task.title}
                  </span>
                  <ImportanceBadge level={task.importance} />
                  <div className="hidden sm:flex items-center gap-2">
                    <CategoryBadge category={task.category} />
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <StatusBadge status={task.status} />
              {(task.contato || task.client) && (
                <>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">{task.contato || task.client}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className={`transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''} p-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl`}>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm("Deseja realmente excluir esta tarefa?")) {
                onDelete(task.id);
              }
            }}
            className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-premium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-6 pb-8 pt-2 border-t border-gray-100 dark:border-white/5 bg-slate-50/30 dark:bg-slate-950/30 animate-in slide-in-from-top-4 duration-500">
          {/* Action Buttons */}
          <div className="flex justify-end mb-6 gap-3 pt-4">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20 hover:bg-indigo-500/20 transition-premium uppercase tracking-widest"
              >
                Editar Registro
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="text-[10px] font-black text-white bg-indigo-600 px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-premium uppercase tracking-widest"
                >
                  Salvar Alterações
                </button>
                <button
                  onClick={handleCancel}
                  className="text-[10px] font-black text-slate-500 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-premium uppercase tracking-widest"
                >
                  Cancelar
                </button>
              </>
            )}
          </div>

          {/* Category Selector (Editing only) */}
          {isEditing && (
            <div className="mb-8 p-6 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-indigo-100 dark:border-indigo-500/10 shadow-xl">
              <label className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4 block">Seletor de Categoria</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {(['Pessoal', 'Trabalho', 'Clientes', 'Financeiro', 'Estudos', 'Projetos'] as TaskCategory[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleChange('category', cat)}
                    className={`text-[10px] font-black py-2.5 rounded-xl border transition-premium ${editData.category === cat
                      ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl'
                      : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:text-indigo-500 dark:hover:text-white'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Attributes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Status do Ciclo</label>
              {isEditing ? (
                <select className="text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none transition-premium h-[3.5rem]" value={editData.status} onChange={(e) => handleChange('status', e.target.value as TaskStatus)}>
                  <option value="Para Fazer">1. Para Fazer</option>
                  <option value="Em Andamento">2. Em Andamento</option>
                  <option value="Aguardando">3. Aguardando</option>
                  <option value="Concluída">4. Concluída</option>
                </select>
              ) : (
                <div className="text-xs font-black bg-white/50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner">
                  <StatusBadge status={task.status} />
                </div>
              )}
            </div>

            {/* Category-specific fields */}
            {(task.category === 'Trabalho' || !task.category) && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Contato / Lead</label>
                  {isEditing ? (
                    <input className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none transition-premium h-[3.5rem]" value={editData.contato || editData.client || ""} onChange={(e) => handleChange('contato', e.target.value)} />
                  ) : (
                    <div className="text-xs font-black text-slate-800 dark:text-white bg-white/50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner">{task.contato || task.client || "—"}</div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Organização</label>
                  {isEditing ? (
                    <input className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none transition-premium h-[3.5rem]" value={editData.empresa || ""} onChange={(e) => handleChange('empresa', e.target.value)} />
                  ) : (
                    <div className="text-xs font-black text-slate-800 dark:text-white bg-white/50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner">{task.empresa || "—"}</div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Investimento</label>
                  {isEditing ? (
                    <input className="text-xs font-black text-indigo-500 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none transition-premium h-[3.5rem]" value={editData.value || ""} onChange={(e) => handleChange('value', e.target.value)} />
                  ) : (
                    <div className="text-xs font-black text-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner">{task.value || "R$ 0,00"}</div>
                  )}
                </div>
              </>
            )}

            {task.category === 'Pessoal' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">📍 Localização</label>
                  {isEditing ? (
                    <input className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none h-[3.5rem]" value={editData.local || ""} onChange={(e) => handleChange('local', e.target.value)} />
                  ) : (
                    <div className="text-xs font-black text-slate-800 dark:text-white bg-white/50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner">{task.local || "—"}</div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">✨ Vibe / Humor</label>
                  {isEditing ? (
                    <input className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none h-[3.5rem]" value={editData.humor || ""} onChange={(e) => handleChange('humor', e.target.value)} />
                  ) : (
                    <div className="text-xs font-black text-slate-800 dark:text-white bg-white/50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner">{task.humor || "—"}</div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">👥 Círculo / Pessoas</label>
                  {isEditing ? (
                    <input className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none h-[3.5rem]" value={editData.participantes || ""} onChange={(e) => handleChange('participantes', e.target.value)} />
                  ) : (
                    <div className="text-xs font-black text-slate-800 dark:text-white bg-white/50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner">{task.participantes || "—"}</div>
                  )}
                </div>
              </>
            )}

            {task.category === 'Clientes' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">🤝 Briefing / Resumo</label>
                  {isEditing ? (
                    <input className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none h-[3.5rem]" value={editData.briefing || ""} onChange={(e) => handleChange('briefing', e.target.value)} />
                  ) : (
                    <div className="text-xs font-black text-slate-800 dark:text-white bg-white/50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner">{task.briefing || "—"}</div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">📂 Link do Canvas</label>
                  {isEditing ? (
                    <input className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none h-[3.5rem]" value={editData.linkArquivos || ""} onChange={(e) => handleChange('linkArquivos', e.target.value)} />
                  ) : (
                    <a href={task.linkArquivos} target="_blank" rel="noreferrer" className="text-xs font-black text-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner hover:bg-indigo-500/10 transition-premium">{task.linkArquivos ? "Acessar Lab" : "—"}</a>
                  )}
                </div>
              </>
            )}

            {task.category === 'Financeiro' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">💰 Montante</label>
                  {isEditing ? (
                    <input className="text-xs font-black text-indigo-500 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none h-[3.5rem]" value={editData.value || ""} onChange={(e) => handleChange('value', e.target.value)} />
                  ) : (
                    <div className="text-xs font-black text-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner">{task.value || "R$ 0,00"}</div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">📈 Tipo de Fluxo</label>
                  {isEditing ? (
                    <select className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none h-[3.5rem]" value={editData.fluxo || "Entrada"} onChange={(e) => handleChange('fluxo', e.target.value)}>
                      <option value="Entrada">Entrada (Receita)</option>
                      <option value="Saída">Saída (Despesa)</option>
                    </select>
                  ) : (
                    <div className={`text-xs font-black p-4 rounded-2xl border min-h-[3.5rem] flex items-center shadow-inner ${task.fluxo === 'Saída' ? 'text-rose-500 bg-rose-500/5 border-rose-500/20' : 'text-emerald-500 bg-emerald-500/5 border-emerald-500/20'}`}>
                      {task.fluxo || "Entrada"}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">📌 Natureza</label>
                  {isEditing ? (
                    <select className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none h-[3.5rem]" value={editData.tipoFinanceiro || "Fixo"} onChange={(e) => handleChange('tipoFinanceiro', e.target.value)}>
                      <option value="Fixo">Fixo Mensal</option>
                      <option value="Variável">Variável</option>
                    </select>
                  ) : (
                    <div className="text-xs font-black text-slate-800 dark:text-white bg-white/50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner">{task.tipoFinanceiro || "Fixo"}</div>
                  )}
                </div>
              </>
            )}

            {task.category === 'Estudos' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">📚 Matéria / Curso</label>
                  {isEditing ? (
                    <input className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none h-[3.5rem]" value={editData.materia || ""} onChange={(e) => handleChange('materia', e.target.value)} />
                  ) : (
                    <div className="text-xs font-black text-slate-800 dark:text-white bg-white/50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner">{task.materia || "—"}</div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">📝 Módulo / Tópico</label>
                  {isEditing ? (
                    <input className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none h-[3.5rem]" value={editData.topico || ""} onChange={(e) => handleChange('topico', e.target.value)} />
                  ) : (
                    <div className="text-xs font-black text-slate-800 dark:text-white bg-white/50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner">{task.topico || "—"}</div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">🔗 Acesso Rápido</label>
                  {isEditing ? (
                    <input className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none h-[3.5rem]" value={editData.linkAula || ""} onChange={(e) => handleChange('linkAula', e.target.value)} />
                  ) : (
                    <a href={task.linkAula} target="_blank" rel="noreferrer" className="text-xs font-black text-rose-500 bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner hover:bg-rose-500/10 transition-premium">{task.linkAula ? "Abrir Aula" : "—"}</a>
                  )}
                </div>
              </>
            )}

            {task.category === 'Projetos' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">🚀 Versão / Milestone</label>
                  {isEditing ? (
                    <input className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none h-[3.5rem]" value={editData.milestone || ""} onChange={(e) => handleChange('milestone', e.target.value)} />
                  ) : (
                    <div className="text-xs font-black text-slate-800 dark:text-white bg-white/50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner">{task.milestone || "v1.0.0"}</div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">💻 Stack Técnica</label>
                  {isEditing ? (
                    <input className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none h-[3.5rem]" value={editData.stack || ""} onChange={(e) => handleChange('stack', e.target.value)} />
                  ) : (
                    <div className="text-xs font-black text-slate-800 dark:text-white bg-white/50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner">{task.stack || "React / Node"}</div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">📁 Repositório Git</label>
                  {isEditing ? (
                    <input className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none h-[3.5rem]" value={editData.repo || ""} onChange={(e) => handleChange('repo', e.target.value)} />
                  ) : (
                    <a href={task.repo} target="_blank" rel="noreferrer" className="text-xs font-black text-slate-800 dark:text-white bg-white/50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner hover:bg-slate-50 dark:hover:bg-slate-800 transition-premium">{task.repo ? "Explore Code" : "—"}</a>
                  )}
                </div>
              </>
            )}

            {/* Standard fields for all categories */}
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">🔥 Prioridade</label>
              {isEditing ? (
                <select className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none h-[3.5rem]" value={editData.importance || "baixa"} onChange={(e) => handleChange('importance', e.target.value as ImportanceLevel)}>
                  <option value="baixa">Baixa</option>
                  <option value="média">Média</option>
                  <option value="alta">Alta</option>
                </select>
              ) : (
                <div className="text-xs font-black bg-white/50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner">
                  <ImportanceBadge level={task.importance} />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">📅 Data Limite</label>
              {isEditing ? (
                <input type="date" className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none h-[3.5rem]" value={editData.endDate || ""} onChange={(e) => handleChange('endDate', e.target.value)} />
              ) : (
                <div className="text-xs font-black text-slate-800 dark:text-white bg-white/50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner">
                  {task.endDate ? new Date(task.endDate).toLocaleDateString('pt-BR') : "—"}
                </div>
              )}
            </div>
          </div>

          {/* Payment Module (Conditional) */}
          {(task.category === 'Trabalho' || !task.category) && isPaymentModuleActive && (
            <div className="mt-10 pt-8 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.2em] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  Gestão Financeira
                </h4>
                {editData.pagamento && <PaymentStatusBadge status={editData.pagamento.status} />}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Status do Fluxo</label>
                  {isEditing ? (
                    <select
                      className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none transition-premium h-[3.5rem]"
                      value={editData.pagamento?.status || 'Não aplicável'}
                      onChange={(e) => handlePaymentChange('status', e.target.value as PaymentStatus)}
                    >
                      <option value="Não aplicável">Não aplicável</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Pago">Pago</option>
                    </select>
                  ) : (
                    <div className="text-xs font-black text-slate-800 dark:text-white bg-white/50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner">
                      {task.pagamento?.status || "Não aplicável"}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Modalidade</label>
                  {isEditing ? (
                    <select
                      className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none transition-premium h-[3.5rem]"
                      value={editData.pagamento?.tipo || 'À vista'}
                      onChange={(e) => handlePaymentChange('tipo', e.target.value as PaymentType)}
                    >
                      <option value="À vista">À vista</option>
                      <option value="Parcelado">Parcelado</option>
                    </select>
                  ) : (
                    <div className="text-xs font-black text-slate-800 dark:text-white bg-white/50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner">
                      {task.pagamento?.tipo || "À vista"}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Vencimento</label>
                  {isEditing ? (
                    <input type="date" className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-3 focus:border-indigo-500/30 outline-none transition-premium h-[3.5rem]" value={editData.pagamento?.dataPagamento || ""} onChange={(e) => handlePaymentChange('dataPagamento', e.target.value)} />
                  ) : (
                    <div className="text-xs font-black text-slate-800 dark:text-white bg-white/50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 rounded-2xl p-4 min-h-[3.5rem] flex items-center shadow-inner">
                      {task.pagamento?.dataPagamento ? new Date(task.pagamento.dataPagamento).toLocaleDateString('pt-BR') : "—"}
                    </div>
                  )}
                </div>
              </div>

              {editData.pagamento && editData.pagamento.tipo === 'Parcelado' && (
                <div className="bg-slate-100/50 dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-100 dark:border-white/5">
                  <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Pipeline de Parcelas</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {editData.pagamento.parcelas.map((p, idx) => (
                      <div key={p.numero} className="flex items-center space-x-4 bg-white/80 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                        <input
                          type="checkbox"
                          checked={p.paga}
                          onChange={() => toggleInstallment(idx)}
                          className="w-5 h-5 rounded-lg border-slate-200 dark:border-slate-700 text-indigo-500 focus:ring-indigo-500 transition-premium"
                        />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-800 dark:text-white">Parcela {p.numero}</span>
                          <span className={`text-[9px] font-black uppercase ${p.paga ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {p.paga ? 'Liquidado' : 'Aberto'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attachments Section */}
          <div className="mt-12 pt-8 border-t border-slate-100 dark:border-white/5">
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.2em] flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </div>
                Arquivo de Midia
              </h4>
              <div className="flex items-center gap-3">
                <label className={`cursor-pointer text-[10px] font-black px-5 py-2.5 rounded-xl border transition-premium flex items-center gap-2 ${isUploading ? 'bg-slate-100 text-slate-400 border-slate-200' : 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20'}`}>
                  {isUploading ? (
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                  {isUploading ? 'PROCESSANDO...' : 'ADICIONAR'}
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                </label>

                {!isUploading && (
                  <label className="cursor-pointer text-[10px] font-black px-5 py-2.5 rounded-xl border border-emerald-500/20 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 transition-premium flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    CAM
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                  </label>
                )}
              </div>
            </div>

            {task.attachments && task.attachments.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {task.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/att relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden hover:border-indigo-500/30 transition-premium shadow-sm hover:shadow-xl"
                  >
                    {att.type.startsWith('image/') ? (
                      <div className="aspect-square w-full overflow-hidden bg-slate-100">
                        <img src={att.url} alt={att.name} className="w-full h-full object-cover group-hover/att:scale-110 transition-transform duration-700" />
                      </div>
                    ) : (
                      <div className="aspect-square w-full flex items-center justify-center bg-indigo-500/5">
                        <svg className="w-10 h-10 text-indigo-500/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 truncate flex-1">{att.name}</span>
                      <svg className="w-3.5 h-3.5 text-indigo-500 opacity-0 group-hover/att:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 bg-slate-50/50 dark:bg-slate-900/50 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-white/5">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Nenhum arquivo <br /> anexado ainda</p>
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="mt-8 flex flex-col">
            <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-3">Notas & Pensamentos</label>
            {isEditing ? (
              <textarea
                className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-4 focus:border-indigo-500/30 outline-none transition-premium min-h-[100px] resize-none"
                value={editData.description || ""}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            ) : (
              <div className="text-sm text-slate-700 dark:text-slate-400 leading-relaxed bg-white/50 dark:bg-slate-900/50 p-5 rounded-3xl border border-slate-100 dark:border-white/5 italic">
                {task.description || "Nenhuma nota adicional para este registro."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskItem;


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
      alta: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50',
      média: 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/50',
      baixa: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50'
    };
    return (
      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${colors[level as keyof typeof colors]}`}>
        {level}
      </span>
    );
  };

  const StatusBadge = ({ status }: { status: TaskStatus }) => {
    const colors = {
      'Para Fazer': 'text-orange-600 dark:text-orange-400',
      'Em Andamento': 'text-blue-600 dark:text-blue-400',
      'Aguardando': 'text-purple-600 dark:text-purple-400',
      'Concluída': 'text-green-700 dark:text-green-400'
    };
    return (
      <span className={`text-[10px] font-black uppercase ${colors[status]}`}>
        {status}
      </span>
    );
  };

  const CategoryBadge = ({ category }: { category: TaskCategory }) => {
    const colors = {
      'Pessoal': 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/50',
      'Trabalho': 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/50',
      'Clientes': 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
      'Financeiro': 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
      'Estudos': 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50',
      'Projetos': 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-950/40 dark:text-slate-400 dark:border-slate-900/50'
    };
    return (
      <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded border ${colors[category] || colors['Trabalho']}`}>
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
    <div className={`group mb-3 bg-white dark:bg-slate-800 border rounded-2xl shadow-sm transition-all hover:shadow-md ${isCompleted ? 'border-green-200 dark:border-green-900/30 bg-green-50/20 dark:bg-green-900/10' : 'border-gray-100 dark:border-slate-700'} hover:border-indigo-200 dark:hover:border-indigo-900/50`}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-4 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(task.id);
            }}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${isCompleted
              ? 'bg-green-600 border-green-600'
              : 'border-gray-400 dark:border-slate-600 hover:border-indigo-500 dark:hover:border-indigo-400'
              }`}
          >
            {isCompleted && (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {isEditing ? (
                <input
                  autoFocus
                  className="text-sm font-bold bg-gray-100 text-gray-900 border border-indigo-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className={`text-sm font-bold truncate ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                  {task.title}
                </span>
              )}
              <ImportanceBadge level={task.importance} />
              <div className="hidden sm:flex items-center gap-2">
                <CategoryBadge category={task.category} />
                {task.pagamento && task.pagamento.status !== 'Não aplicável' && (
                  <PaymentStatusBadge status={task.pagamento.status} />
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2 text-[10px] text-gray-500 dark:text-gray-400 font-medium">

              <StatusBadge status={task.status} />
              {(task.contato || task.client) && (
                <>
                  <span>•</span>
                  <span className="text-indigo-700 dark:text-indigo-400 font-bold">{task.contato || task.client}</span>
                </>
              )}
              {task.empresa && (
                <>
                  <span>•</span>
                  <span className="text-gray-600 dark:text-gray-400 font-bold">{task.empresa}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm("Deseja realmente excluir esta tarefa?")) {
                onDelete(task.id);
              }
            }}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-5 pt-2 border-t border-gray-100 dark:border-slate-700 bg-gray-50/40 dark:bg-slate-900/40 animate-in slide-in-from-top-2 duration-200">
          <div className="flex justify-end mb-4 gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200 hover:bg-indigo-200 transition-colors"
              >
                EDITAR DADOS
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="text-[10px] font-bold text-white bg-green-700 px-3 py-1 rounded-full border border-green-700 hover:bg-green-800 transition-colors"
                >
                  SALVAR
                </button>
                <button
                  onClick={handleCancel}
                  className="text-[10px] font-bold text-gray-700 bg-white px-3 py-1 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors"
                >
                  CANCELAR
                </button>
              </>
            )}
          </div>

          {isEditing && (
            <div className="mb-6 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100">
              <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-3 block">Mudar Categoria</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {(['Pessoal', 'Trabalho', 'Clientes', 'Financeiro', 'Estudos', 'Projetos'] as TaskCategory[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleChange('category', cat)}
                    className={`text-[9px] font-bold py-2 rounded-xl border transition-all ${editData.category === cat
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">Status Tarefa</label>
              {isEditing ? (
                <select className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-[2.25rem]" value={editData.status} onChange={(e) => handleChange('status', e.target.value as TaskStatus)}>
                  <option value="Para Fazer">1. Para Fazer</option>
                  <option value="Em Andamento">2. Em Andamento</option>
                  <option value="Aguardando">3. Aguardando</option>
                  <option value="Concluída">4. Concluída</option>
                </select>
              ) : (
                <div className="text-xs font-bold bg-white p-2 rounded-lg border border-gray-200 shadow-sm min-h-[2.25rem] flex items-center"><StatusBadge status={task.status} /></div>
              )}
            </div>

            {/* CAMPOS DINÂMICOS POR CATEGORIA */}
            {(task.category === 'Trabalho' || !task.category) && (
              <>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">Contato</label>
                  {isEditing ? (
                    <input className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.contato || editData.client || ""} onChange={(e) => handleChange('contato', e.target.value)} />
                  ) : (
                    <div className="text-xs text-gray-900 dark:text-gray-100 font-medium bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm min-h-[2.25rem] flex items-center">{task.contato || task.client || "—"}</div>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">Empresa</label>
                  {isEditing ? (
                    <input className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.empresa || ""} onChange={(e) => handleChange('empresa', e.target.value)} />
                  ) : (
                    <div className="text-xs text-gray-900 dark:text-gray-100 font-medium bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm min-h-[2.25rem] flex items-center">{task.empresa || "—"}</div>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">Tarefa</label>
                  {isEditing ? (
                    <input className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.tarefa || editData.service || ""} onChange={(e) => handleChange('tarefa', e.target.value)} />
                  ) : (
                    <div className="text-xs text-gray-900 dark:text-gray-100 font-medium bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm min-h-[2.25rem] flex items-center">{task.tarefa || task.service || "—"}</div>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">Valor</label>
                  {isEditing ? (
                    <input className="text-xs text-indigo-700 font-bold bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.value || ""} onChange={(e) => handleChange('value', e.target.value)} />
                  ) : (
                    <div className="text-xs text-indigo-700 dark:text-indigo-400 font-bold bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm min-h-[2.25rem] flex items-center">{task.value || "R$ 0,00"}</div>
                  )}
                </div>
              </>
            )}

            {task.category === 'Pessoal' && (
              <>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">📍 Local</label>
                  {isEditing ? (
                    <input className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.local || ""} onChange={(e) => handleChange('local', e.target.value)} />
                  ) : (
                    <div className="text-xs text-gray-900 dark:text-gray-100 font-medium bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm min-h-[2.25rem] flex items-center">{task.local || "—"}</div>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">✨ Humor/Vibe</label>
                  {isEditing ? (
                    <input className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.humor || ""} onChange={(e) => handleChange('humor', e.target.value)} />
                  ) : (
                    <div className="text-xs text-gray-900 dark:text-gray-100 font-medium bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm min-h-[2.25rem] flex items-center">{task.humor || "—"}</div>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">👥 Participantes</label>
                  {isEditing ? (
                    <input className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.participantes || ""} onChange={(e) => handleChange('participantes', e.target.value)} />
                  ) : (
                    <div className="text-xs text-gray-900 dark:text-gray-100 font-medium bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm min-h-[2.25rem] flex items-center">{task.participantes || "—"}</div>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">🌿 Bem-estar</label>
                  {isEditing ? (
                    <input className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.bemEstar || ""} onChange={(e) => handleChange('bemEstar', e.target.value)} />
                  ) : (
                    <div className="text-xs text-gray-900 dark:text-gray-100 font-medium bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm min-h-[2.25rem] flex items-center">{task.bemEstar || "—"}</div>
                  )}
                </div>
              </>
            )}

            {task.category === 'Clientes' && (
              <>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">🤝 Briefing</label>
                  {isEditing ? (
                    <input className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.briefing || ""} onChange={(e) => handleChange('briefing', e.target.value)} />
                  ) : (
                    <div className="text-xs text-gray-900 dark:text-gray-100 font-medium bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm min-h-[2.25rem] flex items-center">{task.briefing || "—"}</div>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">📂 Link Arquivos</label>
                  {isEditing ? (
                    <input className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.linkArquivos || ""} onChange={(e) => handleChange('linkArquivos', e.target.value)} />
                  ) : (
                    <a href={task.linkArquivos} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 font-bold bg-white p-2 rounded-lg border border-gray-200 shadow-sm min-h-[2.25rem] flex items-center hover:underline">{task.linkArquivos ? "Abrir Link" : "—"}</a>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">⏳ Prazo Aprovação</label>
                  {isEditing ? (
                    <input type="date" className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-[2.25rem]" value={editData.prazoAprovação || ""} onChange={(e) => handleChange('prazoAprovação', e.target.value)} />
                  ) : (
                    <div className="text-xs text-gray-900 dark:text-gray-100 font-medium bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm min-h-[2.25rem] flex items-center">
                      {task.prazoAprovação ? new Date(task.prazoAprovação).toLocaleDateString('pt-BR') : "—"}
                    </div>
                  )}
                </div>
              </>
            )}

            {task.category === 'Financeiro' && (
              <>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">💰 Valor</label>
                  {isEditing ? (
                    <input className="text-xs text-indigo-700 font-bold bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.value || ""} onChange={(e) => handleChange('value', e.target.value)} />
                  ) : (
                    <div className="text-xs text-indigo-700 font-bold bg-white p-2 rounded-lg border border-gray-200 shadow-sm min-h-[2.25rem] flex items-center">{task.value || "R$ 0,00"}</div>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">📈 Fluxo</label>
                  {isEditing ? (
                    <select className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-[2.25rem]" value={editData.fluxo || "Entrada"} onChange={(e) => handleChange('fluxo', e.target.value)}>
                      <option value="Entrada">Entrada (Receita)</option>
                      <option value="Saída">Saída (Despesa)</option>
                    </select>
                  ) : (
                    <div className={`text-xs font-bold p-2 rounded-lg border shadow-sm min-h-[2.25rem] flex items-center ${task.fluxo === 'Saída' ? 'text-red-600 bg-red-50 border-red-100' : 'text-green-600 bg-green-50 border-green-100'}`}>
                      {task.fluxo || "Entrada"}
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">📌 Tipo</label>
                  {isEditing ? (
                    <select className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-[2.25rem]" value={editData.tipoFinanceiro || "Fixo"} onChange={(e) => handleChange('tipoFinanceiro', e.target.value)}>
                      <option value="Fixo">Mensal Fixa</option>
                      <option value="Variável">Variável</option>
                    </select>
                  ) : (
                    <div className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-gray-200 shadow-sm min-h-[2.25rem] flex items-center">{task.tipoFinanceiro || "Fixo"}</div>
                  )}
                </div>
              </>
            )}

            {task.category === 'Estudos' && (
              <>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">📚 Matéria</label>
                  {isEditing ? (
                    <input className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.materia || ""} onChange={(e) => handleChange('materia', e.target.value)} />
                  ) : (
                    <div className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-gray-200 shadow-sm min-h-[2.25rem] flex items-center">{task.materia || "—"}</div>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">📝 Tópico</label>
                  {isEditing ? (
                    <input className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.topico || ""} onChange={(e) => handleChange('topico', e.target.value)} />
                  ) : (
                    <div className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-gray-200 shadow-sm min-h-[2.25rem] flex items-center">{task.topico || "—"}</div>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">🔗 Link Aula</label>
                  {isEditing ? (
                    <input className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.linkAula || ""} onChange={(e) => handleChange('linkAula', e.target.value)} />
                  ) : (
                    <a href={task.linkAula} target="_blank" rel="noreferrer" className="text-xs text-rose-600 font-bold bg-white p-2 rounded-lg border border-gray-200 shadow-sm min-h-[2.25rem] flex items-center hover:underline">{task.linkAula ? "Acessar Aula" : "—"}</a>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">🔄 Revisão</label>
                  {isEditing ? (
                    <input type="date" className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-[2.25rem]" value={editData.dataRevisao || ""} onChange={(e) => handleChange('dataRevisao', e.target.value)} />
                  ) : (
                    <div className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-gray-200 shadow-sm min-h-[2.25rem] flex items-center">
                      {task.dataRevisao ? new Date(task.dataRevisao).toLocaleDateString('pt-BR') : "—"}
                    </div>
                  )}
                </div>
              </>
            )}

            {task.category === 'Projetos' && (
              <>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">🚀 Milestone</label>
                  {isEditing ? (
                    <input className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.milestone || ""} onChange={(e) => handleChange('milestone', e.target.value)} />
                  ) : (
                    <div className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-gray-200 shadow-sm min-h-[2.25rem] flex items-center">{task.milestone || "v1.0.0"}</div>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">💻 Stack Tech</label>
                  {isEditing ? (
                    <input className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.stack || ""} onChange={(e) => handleChange('stack', e.target.value)} />
                  ) : (
                    <div className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-gray-200 shadow-sm min-h-[2.25rem] flex items-center">{task.stack || "React / Node"}</div>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">📁 Repo Git</label>
                  {isEditing ? (
                    <input className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.repo || ""} onChange={(e) => handleChange('repo', e.target.value)} />
                  ) : (
                    <a href={task.repo} target="_blank" rel="noreferrer" className="text-xs text-slate-600 font-bold bg-white p-2 rounded-lg border border-gray-200 shadow-sm min-h-[2.25rem] flex items-center hover:underline">{task.repo ? "Ver Repo" : "—"}</a>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">🏃 Sprint</label>
                  {isEditing ? (
                    <input className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editData.sprint || ""} onChange={(e) => handleChange('sprint', e.target.value)} />
                  ) : (
                    <div className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-gray-200 shadow-sm min-h-[2.25rem] flex items-center">{task.sprint || "Sprint 0"}</div>
                  )}
                </div>
              </>
            )}

            <div className="flex flex-col">
              <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">Importância</label>
              {isEditing ? (
                <select className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-[2.25rem]" value={editData.importance || "baixa"} onChange={(e) => handleChange('importance', e.target.value as ImportanceLevel)}>
                  <option value="baixa">Baixa</option>
                  <option value="média">Média</option>
                  <option value="alta">Alta</option>
                </select>
              ) : (
                <div className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-gray-200 shadow-sm min-h-[2.25rem] flex items-center">
                  <ImportanceBadge level={task.importance} />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">Data de Início</label>
              {isEditing ? (
                <input type="date" className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-[2.25rem]" value={editData.startDate || ""} onChange={(e) => handleChange('startDate', e.target.value)} />
              ) : (
                <div className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-gray-200 shadow-sm min-h-[2.25rem] flex items-center">
                  {task.startDate ? new Date(task.startDate).toLocaleDateString('pt-BR') : "—"}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <label className="text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1">Data de Término</label>
              {isEditing ? (
                <input type="date" className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-[2.25rem]" value={editData.endDate || ""} onChange={(e) => handleChange('endDate', e.target.value)} />
              ) : (
                <div className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-gray-300/50 shadow-sm min-h-[2.25rem] flex items-center">
                  {task.endDate ? new Date(task.endDate).toLocaleDateString('pt-BR') : "—"}
                </div>
              )}
            </div>
            <div className="hidden md:block"></div>
          </div>

          {(task.category === 'Trabalho' || !task.category) && isPaymentModuleActive && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center">
                  <svg className="w-3.5 h-3.5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Módulo de Pagamento
                </h4>
                {editData.pagamento && <PaymentStatusBadge status={editData.pagamento.status} />}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">Status Pgto</label>
                  {isEditing ? (
                    <select
                      className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-[2.25rem]"
                      value={editData.pagamento?.status || 'Não aplicável'}
                      onChange={(e) => handlePaymentChange('status', e.target.value as PaymentStatus)}
                    >
                      <option value="Não aplicável">Não aplicável</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Pago">Pago</option>
                    </select>
                  ) : (
                    <div className="text-xs text-gray-900 dark:text-gray-100 font-medium bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm min-h-[2.25rem] flex items-center">
                      {task.pagamento?.status || "Não aplicável"}
                    </div>
                  )}
                </div>

                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">Tipo</label>
                  {isEditing ? (
                    <select
                      className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-[2.25rem]"
                      value={editData.pagamento?.tipo || 'À vista'}
                      onChange={(e) => handlePaymentChange('tipo', e.target.value as PaymentType)}
                    >
                      <option value="À vista">À vista</option>
                      <option value="Parcelado">Parcelado</option>
                    </select>
                  ) : (
                    <div className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-gray-200 shadow-sm min-h-[2.25rem] flex items-center">
                      {task.pagamento?.tipo || "À vista"}
                    </div>
                  )}
                </div>

                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">Parcelas (1-10)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min="1" max="10"
                      disabled={editData.pagamento?.tipo === 'À vista'}
                      className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-[2.25rem] disabled:opacity-50"
                      value={editData.pagamento?.totalParcelas || 1}
                      onChange={(e) => handlePaymentChange('totalParcelas', parseInt(e.target.value))}
                    />
                  ) : (
                    <div className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-gray-200 shadow-sm min-h-[2.25rem] flex items-center">
                      {task.pagamento?.totalParcelas || 1}x
                    </div>
                  )}
                </div>

                <div className="flex flex-col">
                  <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">Vencimento</label>
                  {isEditing ? (
                    <input type="date" className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-[2.25rem]" value={editData.pagamento?.dataPagamento || ""} onChange={(e) => handlePaymentChange('dataPagamento', e.target.value)} />
                  ) : (
                    <div className="text-xs text-gray-900 font-medium bg-white p-2 rounded-lg border border-gray-300/50 shadow-sm min-h-[2.25rem] flex items-center">
                      {task.pagamento?.dataPagamento ? new Date(task.pagamento.dataPagamento).toLocaleDateString('pt-BR') : "—"}
                    </div>
                  )}
                </div>
              </div>

              {editData.pagamento && editData.pagamento.tipo === 'Parcelado' && (
                <div className="bg-white rounded-2xl p-4 border border-gray-300/50 shadow-inner">
                  <h5 className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-4">Controle de Parcelas</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {editData.pagamento.parcelas.map((p, idx) => (
                      <div key={p.numero} className="flex items-center space-x-3 bg-gray-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-gray-300/50 dark:border-slate-700 shadow-sm">
                        <input
                          type="checkbox"
                          checked={p.paga}
                          onChange={() => toggleInstallment(idx)}
                          className="w-4 h-4 rounded-md border-gray-400 dark:border-slate-600 text-indigo-700 focus:ring-indigo-500"
                        />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-gray-900 dark:text-gray-100">Parcela {p.numero}</span>
                          <span className={`text-[9px] font-black uppercase ${p.paga ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {p.paga ? 'Em dia' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center">
                <svg className="w-3.5 h-3.5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                Documentos e Fotos
              </h4>
              <div className="flex items-center gap-2">
                <label className={`cursor-pointer text-[9px] font-bold px-3 py-1 rounded-full border transition-all flex items-center ${isUploading ? 'bg-gray-100 text-gray-400 border-gray-200' : 'text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100'}`}>
                  {isUploading ? (
                    <>
                      <svg className="animate-spin h-3 w-3 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      ENVIANDO...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                      </svg>
                      ANEXAR ARQUIVO
                    </>
                  )}
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                </label>

                {!isUploading && (
                  <label className="cursor-pointer text-[9px] font-bold px-3 py-1 rounded-full border border-green-100 text-green-700 bg-green-50 hover:bg-green-100 transition-all flex items-center">
                    <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    TIRAR FOTO
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                  </label>
                )}
              </div>
            </div>

            {task.attachments && task.attachments.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {task.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/att relative flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-500 transition-all shadow-sm hover:shadow-md"
                  >
                    {att.type.startsWith('image/') ? (
                      <div className="aspect-video w-full overflow-hidden bg-gray-100">
                        <img src={att.url} alt={att.name} className="w-full h-full object-cover group-hover/att:scale-105 transition-transform duration-300" />
                      </div>
                    ) : (
                      <div className="aspect-video w-full flex items-center justify-center bg-indigo-50">
                        <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="p-2 bg-white/90 backdrop-blur-sm border-t border-gray-100 flex items-center">
                      <span className="text-[9px] font-bold text-gray-700 truncate flex-1">{att.name}</span>
                      <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover/att:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <svg className="w-8 h-8 text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nenhum anexo encontrado</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col">
            <label className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">Notas Adicionais</label>
            {isEditing ? (
              <textarea className="text-xs text-gray-800 leading-relaxed bg-white p-3 rounded-xl border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[4rem]" value={editData.description || ""} onChange={(e) => handleChange('description', e.target.value)} />
            ) : (
              <p className="text-xs text-gray-800 leading-relaxed bg-gray-50/50 p-3 rounded-xl border border-gray-300/50 shadow-sm">{task.description || "Nenhuma nota adicional."}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskItem;

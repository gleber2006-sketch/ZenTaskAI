
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

  // Utility Components (Micro)
  const PriorityDot = ({ level }: { level?: ImportanceLevel }) => {
    const colors = {
      alta: 'bg-red-500',
      média: 'bg-amber-400',
      baixa: 'bg-slate-300 dark:bg-slate-600'
    };
    return <div className={`w-2 h-2 rounded-full ${colors[level || 'baixa']} shrink-0`} title={`Prioridade ${level}`} />;
  };

  const CategoryTag = ({ category }: { category: TaskCategory }) => (
    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
      {category}
    </span>
  );

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

  return (
    <div className={`group border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/50 border-b-slate-200 dark:border-b-slate-700' : 'bg-white dark:bg-slate-900'}`}>

      {/* COMPACT ROW (Default View) */}
      <div
        className="flex items-center gap-4 py-2.5 px-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Checkbox */}
        <div
          onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
          className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-all ${isCompleted ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500 dark:hover:border-indigo-400 bg-white dark:bg-slate-800'}`}
        >
          {isCompleted && (
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
          )}
        </div>

        {/* Title & Identifier */}
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <span className={`text-sm font-medium truncate ${isCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
            {task.title}
          </span>
          {task.description && (
            <svg className="w-4 h-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
          )}
        </div>

        {/* Dense Meta Data (Hidden on small screens) */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {task.client && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <svg className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              <span className="truncate max-w-[100px]">{task.client}</span>
            </div>
          )}

          {task.value && (
            <span className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 rounded">{task.value}</span>
          )}

          <CategoryTag category={task.category || 'Trabalho'} />
          <PriorityDot level={task.importance} />

          {task.endDate && (
            <span className={`text-xs ${new Date(task.endDate) < new Date() && !isCompleted ? 'text-red-500 dark:text-red-400 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
              {new Date(task.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* EXPANDED DETAILS (Edit Mode) */}
      {isExpanded && (
        <div className="px-12 pb-6 pt-2 cursor-default">

          {!isEditing ? (
            <div className="space-y-4">
              {/* View Mode */}
              <div className="flex gap-6 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex-1">
                  <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase mb-1">Descrição</h4>
                  <p className="whitespace-pre-wrap dark:text-slate-200">{task.description || "Sem descrição."}</p>
                </div>
                {(task.pagamento?.status !== 'Não aplicável' && task.pagamento) && (
                  <div className="w-1/3 bg-slate-100 dark:bg-slate-800/50 rounded p-3 text-xs border border-slate-200 dark:border-slate-700">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Financeiro</h4>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Status:</span>
                      <span className={task.pagamento.status === 'Pago' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>{task.pagamento.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Valor:</span>
                      <span className="text-slate-900 dark:text-white">{task.value}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                  Editar Tarefa
                </button>
                <button onClick={() => { if (window.confirm('Excluir?')) onDelete(task.id); }} className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition">
                  Excluir
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm space-y-4">
              {/* Edit Form */}
              <input
                className="w-full text-base font-medium border-0 border-b border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:ring-0 px-0 pb-2 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                value={editData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Título da tarefa"
              />

              <textarea
                className="w-full text-sm text-slate-600 dark:text-slate-300 border-0 bg-slate-50 dark:bg-slate-800 rounded p-2 focus:ring-1 focus:ring-indigo-500 min-h-[80px]"
                value={editData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Adicionar descrição..."
              />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Categoria</label>
                  <select
                    className="w-full text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    value={editData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                  >
                    {['Trabalho', 'Pessoal', 'Financeiro', 'Estudos', 'Projetos', 'Clientes'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Data Limite</label>
                  <input
                    type="date"
                    className="w-full text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    value={editData.endDate || ''}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Prioridade</label>
                  <select
                    className="w-full text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    value={editData.importance}
                    onChange={(e) => handleChange('importance', e.target.value)}
                  >
                    <option value="baixa">Baixa</option>
                    <option value="média">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Valor (R$)</label>
                  <input
                    type="text"
                    className="w-full text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    value={editData.value || ''}
                    onChange={(e) => handleChange('value', e.target.value)}
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button onClick={handleCancel} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">Cancelar</button>
                <button onClick={handleSave} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-sm">Salvar Alterações</button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default TaskItem;

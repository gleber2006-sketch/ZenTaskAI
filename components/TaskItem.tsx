
import React, { useState, useEffect } from 'react';
import { Task, Category, Subcategory } from '../types';
import { toggleTaskStatus } from '../services/taskService';
import { fetchSubcategories } from '../services/categoryService';

interface TaskItemProps {
  task: Task;
  categories: Category[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleStatus?: (task: Task) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, categories, onEdit, onDelete, onToggleStatus }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    if (task.subcategoria_id && task.categoria_id) {
      loadSubcategory();
    } else {
      setSubcategory(null);
    }
  }, [task.subcategoria_id, task.categoria_id]);

  const loadSubcategory = async () => {
    try {
      const subs = await fetchSubcategories(task.categoria_id);
      const sub = subs.find(s => s.id === task.subcategoria_id);
      if (sub) setSubcategory(sub);
    } catch (error) {
      console.error("Error loading subcategory in TaskItem", error);
    }
  };

  const isCompleted = task.status === 'concluida';

  const category = categories.find(c => c.id === task.categoria_id);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleStatus) {
      onToggleStatus(task);
    }
  };

  const handleToggleChecklistItem = async (index: number, currentState: boolean) => {
    if (!task.descricao) return;

    const lines = task.descricao.split('\n');
    let checkboxCount = 0;
    const newLines = lines.map(line => {
      if (line.trim().startsWith('- [ ]') || line.trim().startsWith('- [x]')) {
        if (checkboxCount === index) {
          checkboxCount++;
          return line.replace(currentState ? '- [x]' : '- [ ]', currentState ? '- [ ]' : '- [x]');
        }
        checkboxCount++;
      }
      return line;
    });

    try {
      const { updateTask } = await import('../services/taskService');
      await updateTask(task.id, { descricao: newLines.join('\n') });
    } catch (error) {
      console.error("Error updating checklist item", error);
    }
  };

  const handleAddChecklistItem = async (itemText: string) => {
    if (!itemText.trim()) return;
    const newItemLine = `- [ ] ${itemText.trim()}`;
    const newDesc = task.descricao ? `${task.descricao}\n${newItemLine}` : newItemLine;

    try {
      const { updateTask } = await import('../services/taskService');
      await updateTask(task.id, { descricao: newDesc });
      setNewItem('');
    } catch (error) {
      console.error("Error adding checklist item", error);
    }
  };

  const handleDeleteChecklistItem = async (index: number) => {
    if (!task.descricao) return;

    const lines = task.descricao.split('\n');
    let checkboxCount = 0;
    const newLines = lines.filter(line => {
      if (line.trim().startsWith('- [ ]') || line.trim().startsWith('- [x]')) {
        if (checkboxCount === index) {
          checkboxCount++;
          return false; // Remove this line
        }
        checkboxCount++;
      }
      return true;
    });

    try {
      const { updateTask } = await import('../services/taskService');
      await updateTask(task.id, { descricao: newLines.join('\n') });
    } catch (error) {
      console.error("Error deleting checklist item", error);
    }
  };

  const renderDescriptionWithCheckboxes = (text: string) => {
    const lines = text.split('\n');
    let checkboxIndex = 0;

    return lines.map((line, i) => {
      const isUnchecked = line.trim().startsWith('- [ ]');
      const isChecked = line.trim().startsWith('- [x]');

      if (isUnchecked || isChecked) {
        const currentIndex = checkboxIndex++;
        const content = line.replace(isUnchecked ? '- [ ]' : '- [x]', '').trim();

        return (
          <div
            key={i}
            className="flex items-center gap-3 py-2.5 group/item border-b border-white/5 last:border-0"
          >
            <div
              onClick={(e) => { e.stopPropagation(); handleToggleChecklistItem(currentIndex, isChecked); }}
              className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shadow-sm cursor-pointer ${isChecked ? 'bg-emerald-500 border-emerald-500' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover/item:border-indigo-400'}`}
            >
              {isChecked && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
            </div>
            <span
              onClick={(e) => { e.stopPropagation(); handleToggleChecklistItem(currentIndex, isChecked); }}
              className={`text-sm flex-1 cursor-pointer ${isChecked ? 'text-slate-400 line-through' : 'text-slate-600 dark:text-slate-300 font-medium'}`}
            >
              {content || "(Vazio)"}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteChecklistItem(currentIndex); }}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover/item:opacity-100"
              title="Remover item"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        );
      }
      return <p key={i} className="text-sm text-slate-600 dark:text-slate-400 py-0.5">{line}</p>;
    });
  };

  const priorityColors = {
    baixa: 'bg-slate-300 dark:bg-slate-600',
    media: 'bg-amber-400',
    alta: 'bg-orange-500',
    critica: 'bg-red-600'
  };

  const statusLabels = {
    pendente: 'Pendente',
    em_progresso: 'Em Progresso',
    aguardando: 'Aguardando',
    bloqueada: 'Bloqueada',
    concluida: 'Concluída'
  };

  return (
    <div className={`group border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all duration-500 ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/50 border-b-slate-200 dark:border-b-slate-700' : 'bg-white dark:bg-slate-900'} ${isCompleted ? 'opacity-70 contrast-75' : 'opacity-100'}`}>

      {/* COMPACT ROW */}
      <div
        className="flex items-center gap-4 py-3 px-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Checkbox / Status Indicator */}
        <div
          onClick={handleToggle}
          className={`w-11 h-11 flex items-center justify-center shrink-0 cursor-pointer -ml-2`}
          title={`Status: ${statusLabels[task.status]}`}
        >
          <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${isCompleted ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-600/20' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-800'}`}>
            {isCompleted && (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            )}
          </div>
        </div>

        {/* Title & Icons */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium truncate transition-colors ${isCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
              {task.titulo}
            </span>
            {task.metadata?.completed_by_external && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-200 dark:border-emerald-800">
                ⚡ {task.metadata.external_completer_name}
              </span>
            )}
            {task.prioridade === 'critica' && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </div>
          {/* Subline: Category + Date */}
          <div className="flex items-center gap-2 mt-0.5">
            {category && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex items-center gap-1 ${category.cor.includes('bg-') ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500' : ''}`}>
                <span>{category.icone}</span>
                <span className="truncate max-w-[80px]">{category.nome}</span>
              </span>
            )}
            {subcategory && (
              <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border bg-white dark:bg-slate-800 text-gray-400 border-gray-100 dark:border-slate-700">
                {subcategory.nome}
              </span>
            )}
            {task.prazo && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {new Date(task.prazo.seconds * 1000).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Right side Meta */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {/* Tipo Badge */}
          {task.tipo !== 'tarefa' && (
            <span className="text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
              {task.tipo}
            </span>
          )}

          {/* Metadata Highlights */}
          {task.metadata && (
            <div className="flex items-center gap-2">
              {task.metadata.local && (
                <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-1.5 py-0.5 rounded" title={`Local: ${task.metadata.local}`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="max-w-[60px] truncate">{task.metadata.local}</span>
                </div>
              )}
              {Object.keys(task.metadata).length > (task.metadata.local ? 1 : 0) && (
                <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-[10px] font-bold text-indigo-500 border border-indigo-100 dark:border-indigo-800" title="Mais informações disponíveis">
                  +{Object.keys(task.metadata).length - (task.metadata.local ? 1 : 0)}
                </div>
              )}
            </div>
          )}

          {/* Priority Badge */}
          <div className={`w-2.5 h-2.5 rounded-full ${priorityColors[task.prioridade]} shadow-sm ring-1 ring-white dark:ring-slate-900`} title={`Prioridade: ${task.prioridade}`} />

          {/* Value (Legacy/Finance) */}
          {task.value && (
            <span className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 rounded">{task.value}</span>
          )}
        </div>
      </div>

      {/* EXPANDED DETAILS */}
      {isExpanded && (
        <div className="px-12 pb-4 pt-0 cursor-default">
          <div className="flex flex-col gap-3">
            {task.descricao && (
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md border border-slate-100 dark:border-slate-800/50">
                {subcategory?.nome?.trim().toLowerCase() === 'compras'
                  ? (
                    <>
                      {renderDescriptionWithCheckboxes(task.descricao)}
                      {/* Inline Add Button for Compras */}
                      <div className="flex items-center gap-2 pt-3 mt-1 border-t border-slate-200 dark:border-slate-800">
                        <input
                          type="text"
                          value={newItem}
                          onChange={(e) => setNewItem(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddChecklistItem(newItem);
                            }
                          }}
                          placeholder="Adicionar item..."
                          className="flex-1 bg-white dark:bg-slate-800 border-none text-sm py-2 px-3 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none dark:text-white"
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAddChecklistItem(newItem); }}
                          className="w-9 h-9 flex items-center justify-center bg-indigo-600 text-white rounded-lg active:scale-95 shadow-lg shadow-indigo-600/20"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                        </button>
                      </div>
                    </>
                  )
                  : <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">{task.descricao}</p>
                }
              </div>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); onEdit(task); }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 active:scale-95 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Editar
            </button>

            <button
              onClick={async (e) => {
                e.stopPropagation();
                const { updateTask } = await import('../services/taskService');
                if (!task.shared) {
                  await updateTask(task.id, { shared: true });
                }

                const shareUrl = `${window.location.origin}/?task=${task.id}`;
                const shareTitle = 'ZenTask Pro | Tarefa Atribuída';
                const shareText = `⚡ Atribuí uma tarefa para você: ${task.titulo}. Visualize e conclua aqui:`;

                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: shareTitle,
                      text: shareText,
                      url: shareUrl,
                    });
                  } catch (err) {
                    console.log('Error sharing:', err);
                  }
                } else {
                  const waText = encodeURIComponent(`⚡ *ZenTask Pro* | Atribuí uma tarefa para você:\n\n*${task.titulo}*\n\nVisualize e conclua aqui: ${shareUrl}`);
                  window.open(`https://wa.me/?text=${waText}`, '_blank');
                }
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 active:scale-95 transition-all"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 448 512"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.4-8.6-44.6-27.5-16.5-14.7-27.6-32.8-30.8-38.3-3.2-5.5-.3-8.6 2.5-11.3 2.5-2.5 5.5-6.5 8.3-9.8 2.8-3.2 3.7-5.5 5.5-9.3 1.9-3.7.9-6.9-.5-9.8-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.7 23.5 9.2 31.6 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" /></svg>
              Compartilhar
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); if (confirm('Excluir esta tarefa?')) onDelete(task.id); }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl active:scale-95 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Excluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskItem;

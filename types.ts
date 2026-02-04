// Legacy Types (Deprecated)
// export type TaskStatus = ... (Removed to avoid conflict)
// export type ImportanceLevel = ... (Removed)

export type PaymentStatus = 'Não aplicável' | 'Pendente' | 'Pago';
export type PaymentType = 'À vista' | 'Parcelado';
// export type TaskCategory = ... (Deprecated, use Category interface)
export type TaskCategory = string; // Loose typing for legacy compatibility
export type ImportanceLevel = string; // Loose typing for legacy compatibility

export interface Installment {
  numero: number;
  paga: boolean;
  data?: string;
}

// Category System
export interface Category {
  id: string;
  nome: string;
  tipo: 'system' | 'custom';
  fixa: boolean;
  icone: string;
  cor: string;
  ordem: number;
  ativa: boolean;
  descricao?: string;
  criada_em: any; // Timestamp
  criada_por: 'system' | string;
}

export interface Subcategory {
  id: string;
  categoria_id: string;
  nome: string;
  icone?: string;
  cor?: string;
  ordem: number;
  ativa: boolean;
  descricao?: string;
}

export interface PaymentData {
  status: PaymentStatus;
  tipo: PaymentType;
  totalParcelas: number;
  dataPagamento?: string;
  parcelas: Installment[];
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
  createdAt: string;
}

// Task System
export type TaskPriority = 'baixa' | 'media' | 'alta' | 'critica';
export type TaskStatus = 'pendente' | 'em_progresso' | 'bloqueada' | 'concluida';
export type TaskType = 'tarefa' | 'rotina' | 'evento' | 'meta';

export interface Task {
  id: string;
  userId: string;
  titulo: string;
  descricao?: string;

  // Relations
  categoria_id: string;
  subcategoria_id?: string;

  // State
  prioridade: TaskPriority;
  status: TaskStatus;
  tipo: TaskType;

  // Planning
  prazo?: any; // Timestamp
  data_inicio?: any; // Timestamp
  recorrencia?: string;
  ordem: number;

  // Metadata
  criada_em: any; // Timestamp
  atualizada_em: any; // Timestamp

  // Optional legacy fields mapping (kept loose for transition safety if needed, but discouraged)
  client?: string;
  value?: string;
  pagamento?: PaymentData;
}

export enum ActionType {
  CREATE = 'CREATE',
  LIST = 'LIST',
  COMPLETE = 'COMPLETE',
  DELETE = 'DELETE',
  UNKNOWN = 'UNKNOWN'
}

export interface CreatedTaskData {
  title: string;
  description?: string;
  client?: string;
  service?: string;
  contato?: string;
  empresa?: string;
  tarefa?: string;
  value?: string;
  recurrence?: boolean;
  importance?: ImportanceLevel;
  startDate?: string;
  endDate?: string;
  payment?: {
    tipo?: PaymentType;
    totalParcelas?: number;
    status?: PaymentStatus;
    dataPagamento?: string;
    parcelas?: Installment[];
  };
  category?: TaskCategory;
  subcategory?: string;

  // Novos campos específicos (Surpresa)
  local?: string;
  humor?: string;
  participantes?: string;
  bemEstar?: string;
  briefing?: string;
  linkArquivos?: string;
  prazoAprovação?: string;
  fluxo?: 'Entrada' | 'Saída';
  tipoFinanceiro?: 'Fixo' | 'Variável';
  comprovante?: string;
  materia?: string;
  topico?: string;
  linkAula?: string;
  dataRevisao?: string;
  milestone?: string;
  stack?: string;
  repo?: string;
  sprint?: string;
}

export interface AIResponse {
  action: ActionType;
  createdTasks?: CreatedTaskData[];
  id?: string;
  message: string;
}

export interface AppState {
  tasks: Task[];
  history: { role: 'user' | 'assistant'; text: string; hasFile?: boolean }[];
  isLoading: boolean;
}

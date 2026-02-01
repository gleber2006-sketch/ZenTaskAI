
export type TaskStatus = 'Para Fazer' | 'Em Andamento' | 'Aguardando' | 'Concluída';
export type TaskOrigin = 'texto' | 'anexo';
export type ImportanceLevel = 'baixa' | 'média' | 'alta';

export type PaymentStatus = 'Não aplicável' | 'Pendente' | 'Pago';
export type PaymentType = 'À vista' | 'Parcelado';
export type TaskCategory = 'Pessoal' | 'Trabalho' | 'Clientes' | 'Financeiro' | 'Estudos' | 'Projetos';

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

export interface Task {
  id: string;
  title: string;
  description?: string;
  client?: string; // legando (preferir contato)
  service?: string; // legado (preferir tarefa)
  contato?: string;
  empresa?: string;
  tarefa?: string;
  value?: string;
  recurrence?: boolean;
  importance?: ImportanceLevel;
  status: TaskStatus;
  origin: TaskOrigin;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  pagamento?: PaymentData;
  attachments?: Attachment[];
  category: TaskCategory;

  // Campos Pessoais
  local?: string;
  humor?: string;
  participantes?: string;
  bemEstar?: string;

  // Campos Clientes
  briefing?: string;
  linkArquivos?: string;
  prazoAprovação?: string;

  // Campos Financeiros
  fluxo?: 'Entrada' | 'Saída';
  tipoFinanceiro?: 'Fixo' | 'Variável';
  comprovante?: string;

  // Campos Estudos
  materia?: string;
  topico?: string;
  linkAula?: string;
  dataRevisao?: string;

  // Campos Projetos
  milestone?: string;
  stack?: string;
  repo?: string;
  sprint?: string;
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

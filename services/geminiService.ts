
import { GoogleGenAI, Type } from "@google/genai";
import { ActionType, AIResponse, Task } from "../types";

// Tenta obter a chave de múltiplas fontes (Vite e Node process)
const GEMINI_KEY =
  (import.meta as any).env?.VITE_GEMINI_API_KEY ||
  process.env?.GEMINI_API_KEY ||
  process.env?.API_KEY ||
  "";

const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
if (!GEMINI_KEY) {
  console.error("ZenTask AI: Gemini API Key não encontrada!");
}

export interface FilePart {
  mimeType: string;
  data: string; // base64
}

export const processTaskCommand = async (
  userInput: string,
  currentTasks: Task[],
  filePart?: FilePart
): Promise<AIResponse> => {
  const model = 'gemini-flash-lite-latest';

  const taskListContext = currentTasks.length > 0
    ? `Tasks: ${currentTasks.map(t => `#${t.id}: ${t.titulo} (${t.status}, Pago: ${t.pagamento?.status || 'N/A'})`).join(', ')}`
    : "No tasks.";

  const systemInstruction = `You are ZenTask AI. Extract business/personal tasks and details.
1. Categorize: 'Pessoal', 'Trabalho', 'Clientes', 'Financeiro', 'Estudos', 'Projetos'. Default 'Trabalho'.
2. Fields per category:
   - Trabalho: title, contato, empresa, tarefa, value, payment.
   - Pessoal: local, humor, participantes, bemEstar.
   - Clientes: briefing, linkArquivos, prazoAprovação.
   - Financeiro: fluxo ('Entrada'|'Saída'), tipoFinanceiro ('Fixo'|'Variável'), comprovante.
   - Estudos: materia, topico, linkAula, dataRevisao.
   - Projetos: milestone, stack, repo, sprint.
3. Subcategorize (subcategory field):
    - Trabalho: Interno, Cliente, Reunião, Design, Dev
    - Pessoal: Saúde, Lazer, Casa, Família
    - Clientes: Briefing, Aprovação, Reunião
    - Financeiro: Receita, Despesa, Investimento
    - Estudos: Teoria, Prática, Revisão
    - Projetos: Frontend, Backend, Infra, Docs
4. Base fields (all): title, recurrence, importance, startDate, endDate.
Confirm quantity and category in chat.
Context: ${taskListContext}`;

  try {
    const parts: any[] = [{ text: userInput || "Analyze and extract tasks." }];

    if (filePart) {
      parts.push({
        inlineData: {
          mimeType: filePart.mimeType,
          data: filePart.data,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              enum: Object.values(ActionType),
            },
            createdTasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  category: { type: Type.STRING, enum: ['Pessoal', 'Trabalho', 'Clientes', 'Financeiro', 'Estudos', 'Projetos'] },
                  subcategory: { type: Type.STRING },
                  description: { type: Type.STRING },
                  contato: { type: Type.STRING },
                  empresa: { type: Type.STRING },
                  tarefa: { type: Type.STRING },
                  value: { type: Type.STRING },
                  importance: { type: Type.STRING, enum: ['baixa', 'média', 'alta'] },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  payment: {
                    type: Type.OBJECT,
                    properties: {
                      tipo: { type: Type.STRING, enum: ['À vista', 'Parcelado'] },
                      totalParcelas: { type: Type.NUMBER },
                      status: { type: Type.STRING, enum: ['Não aplicável', 'Pendente', 'Pago'] },
                      dataPagamento: { type: Type.STRING }
                    }
                  },
                  // Novos campos
                  local: { type: Type.STRING },
                  humor: { type: Type.STRING },
                  participantes: { type: Type.STRING },
                  bemEstar: { type: Type.STRING },
                  briefing: { type: Type.STRING },
                  linkArquivos: { type: Type.STRING },
                  prazoAprovação: { type: Type.STRING },
                  fluxo: { type: Type.STRING, enum: ['Entrada', 'Saída'] },
                  tipoFinanceiro: { type: Type.STRING, enum: ['Fixo', 'Variável'] },
                  comprovante: { type: Type.STRING },
                  materia: { type: Type.STRING },
                  topico: { type: Type.STRING },
                  linkAula: { type: Type.STRING },
                  dataRevisao: { type: Type.STRING },
                  milestone: { type: Type.STRING },
                  stack: { type: Type.STRING },
                  repo: { type: Type.STRING },
                  sprint: { type: Type.STRING }
                },
                required: ["title"]
              }
            },
            id: { type: Type.STRING },
            message: { type: Type.STRING },
          },
          required: ["action", "message"],
        },
      },
    });

    return JSON.parse(response.text || "{}") as AIResponse;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const errorMessage = error?.message || "Erro desconhecido";
    return {
      action: ActionType.UNKNOWN,
      message: `Erro na IA (${errorMessage}). Verifique se sua chave da API está ativa e se o volume de comandos não excedeu o limite gratuito.`,
    };
  }
};

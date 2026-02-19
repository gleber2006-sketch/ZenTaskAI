
import { GoogleGenAI, Type } from "@google/genai";
import { ActionType, AIResponse, Task } from "../types";

// Tenta obter a chave de múltiplas fontes com segurança para navegador
const getEnvKey = () => {
  try {
    if ((import.meta as any).env?.VITE_GEMINI_API_KEY) return (import.meta as any).env.VITE_GEMINI_API_KEY;
    if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
    if (typeof process !== 'undefined' && process.env?.API_KEY) return process.env.API_KEY;
  } catch (e) {
    console.warn("Acesso ao ambiente restrito:", e);
  }
  return "";
};

const GEMINI_KEY = getEnvKey();
console.log(`🤖 Status da Chave Gemini: ${GEMINI_KEY ? 'Configurada' : 'AUSENTE'}`);

let genAI: GoogleGenAI | null = null;

const getAI = () => {
  if (!genAI) {
    if (!GEMINI_KEY) {
      throw new Error("API key must be set when using the Gemini API. Verifique as variáveis de ambiente.");
    }
    genAI = new GoogleGenAI({ apiKey: GEMINI_KEY });
  }
  return genAI;
};

export interface FilePart {
  mimeType: string;
  data: string; // base64
}


// Throttle Protection
let callCount = 0;
let lastCallReset = Date.now();

export const processTaskCommand = async (
  userInput: string,
  currentTasks: Task[],
  filePart?: FilePart
): Promise<AIResponse> => {
  // Reset Reset Counter every 10 seconds
  if (Date.now() - lastCallReset > 10000) {
    callCount = 0;
    lastCallReset = Date.now();
  }

  callCount++;
  if (callCount > 5) {
    console.error("⛔ TRAVA DE SEGURANÇA: Loop detectado no Zen Assistant. Parando.");
    return {
      action: ActionType.UNKNOWN,
      message: "⛔ Erro Crítico: O sistema detectou um loop de requisições e parou por segurança. Aguarde 10 segundos."
    };
  }

  const model = 'gemini-flash-lite-latest';

  const taskListContext = currentTasks.length > 0
    ? `Tasks: ${currentTasks.map(t => `#${t.id}: ${t.titulo} (${t.status}, Pago: ${t.pagamento?.status || 'N/A'})`).join(', ')}`
    : "No tasks.";

  const systemInstruction = `You are ZenTask AI, an expert consultant in **Finance** and **Personal Productivity**. Your goal is to maximize the user's efficiency and financial health while extracting tasks.
1. Categorize: 'Pessoal', 'Trabalho', 'Clientes', 'Financeiro', 'Estudos', 'Projetos'. Default 'Trabalho'.
2. Fields per category:
   - Trabalho: title, contato, empresa, tarefa, value, payment.
   - Pessoal: local, humor, participantes, bemEstar.
   - Clientes: briefing, linkArquivos, prazoAprovação.
   - Financeiro: fluxo ('entrada'|'saida'), tipoFinanceiro ('Fixo'|'Variável'), comprovante.
   - Estudos: materia, topico, linkAula, dataRevisao.
   - Projetos: milestone, stack, repo, sprint.
3. Subcategorize (subcategory field):
    - Trabalho: Interno, Cliente, Reunião, Design, Dev
    - Pessoal: Saúde, Lazer, Casa, Família
    - Clientes: Briefing, Aprovação, Reunião
    - Financeiro: Receita, Despesa, Investimento
    - Estudos: Teoria, Prática, Revisão
    - Projetos: Frontend, Backend, Infra, Docs
4. Base fields (all): title, recurrence, importance, startDate(YYYY-MM-DD), endDate(YYYY-MM-DD).

IMPORTANT: YOUR PERSONA IN 'message' FIELD:
- You are a strict but helpful Finance & Productivity Specialist.
- LANGUAGE: PORTUGUESE (PT-BR) ONLY.
- If the task is financial (e.g., spending, earning), provide a brief financial tip or analysis in the 'message' (e.g., "Despesa registrada. Lembre-se que pequenos gastos somam grandes montantes.").
- FLUXO RULES: 'saida' for "pagar", "compra", "despesa", "custo". 'entrada' for "receber", "ganho", "venda", "lucro", "salário".
- Be concise.
5. Confirm quantity and category in chat.
6. **IMPORTANT - SHOPPING LISTS / CHECKLISTS**: If the user asks to create a list of items (e.g., "comprar pão, leite, café" or "fazer lista de compras"), you MUST create **ONLY ONE** task with a title like "Lista de Compras" or similar. Format all items as a Markdown checklist in the 'description' field using the exact format: '- [ ] Item Name'.
    - Force subcategory to 'Compras' if it's a shopping list.
    - Do NOT create multiple tasks for list items.
Context: ${taskListContext}`;

  try {
    const ai = getAI();
    const parts: any[] = [{ text: userInput || "Analyze and extract tasks." }];

    if (filePart) {
      parts.push({
        inlineData: {
          mimeType: filePart.mimeType,
          data: filePart.data,
        },
      });
    }


    // Lista de modelos para tentar (Fallback Strategy - Exhaustive)
    // Lista de modelos OTIMIZADA (v1.4.5)
    const candidates = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-1.5-flash',
      'gemini-pro',
    ];

    let response;
    let lastError;

    for (const modelName of candidates) {
      try {
        console.log(`🤖 Tentando modelo: ${modelName}...`);
        response = await ai.models.generateContent({
          model: modelName,
          contents: { parts },
          config: {
            systemInstruction: systemInstruction + ` 
IMPORTANT: Bulk actions:
- To delete EVERYTHING: action='DELETE', id='all'.
- To delete a CATEGORY: action='DELETE', id='cat:CategoryName'.
- To delete a SUBCATEGORY: action='DELETE', id='sub:SubcategoryName'.`,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                action: { type: Type.STRING, enum: [...Object.values(ActionType), 'DELETE_ALL'] },
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
                      local: { type: Type.STRING },
                      humor: { type: Type.STRING },
                      participantes: { type: Type.STRING },
                      bemEstar: { type: Type.STRING },
                      briefing: { type: Type.STRING },
                      linkArquivos: { type: Type.STRING },
                      prazoAprovação: { type: Type.STRING },
                      fluxo: { type: Type.STRING, enum: ['entrada', 'saida'] },
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
        // Se chegou aqui, funcionou!
        console.log(`✅ Sucesso com modelo: ${modelName}`);
        break;
      } catch (e: any) {
        console.warn(`⚠️ Falha com ${modelName}:`, e.message);
        lastError = e;
        // Continua para o próximo
      }
    }

    if (!response && lastError) throw lastError;


    return JSON.parse(response.text || "{}") as AIResponse;
  } catch (error: any) {
    console.error("❌ Erro fatal no Zen Assistant:", error);

    let userFriendlyMsg = "Tive um problema técnico ao processar seu pedido.";

    if (error.message?.includes("API key")) {
      userFriendlyMsg = "⚠️ Chave da API Gemini não configurada ou inválida. Verifique as variáveis de ambiente.";
    } else if (error.status === 404 || error.message?.includes("404")) {
      userFriendlyMsg = "⚠️ Modelo não encontrado. Verifique a configuração de modelo no geminiService.";
    } else if (error.message?.includes("fetch")) {
      userFriendlyMsg = "🌐 Erro de conexão. Verifique sua internet.";
    }

    return {
      action: ActionType.UNKNOWN,
      message: userFriendlyMsg
    };
  }
};

/**
 * Verifica se a IA está configurada e pronta para uso
 */
export const checkAIStatus = () => {
  return {
    configured: !!GEMINI_KEY,
    keySource: GEMINI_KEY ? "Detectada" : "Ausente"
  };
};

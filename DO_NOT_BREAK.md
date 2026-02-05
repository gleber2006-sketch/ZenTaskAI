# 🛡️ PROTOCOLO DE SEGURANÇA (BLINDAGEM)
> **STATUS DO SISTEMA**: ESTÁVEL (GOLD)
> **VERSÃO BASE**: 1.3.2

Este sistema está em regime de **TOLERÂNCIA ZERO PARA REGRESSÃO**.
Qualquer alteração deve seguir estritamente este protocolo.

## 🚨 Regras de Ouro

1.  **Nunca altere lógica que já funciona** sem um teste de verificação prévio.
2.  **Verificação Obrigatória**: Antes de qualquer commit ou deploy, OBRIGATÓRIO rodar:
    ```bash
    npm run verify
    ```
    Se este comando falhar, **PARE**. Não faça push. Corrija o erro primeiro.
3.  **Tipagem Estrita**: Não ignore erros de TypeScript (`any`, `@ts-ignore`) a menos que seja absolutamente impossível resolver de outra forma.
4.  **Auto-Healing**: As funções críticas (`categoryService`, `taskService`) possuem lógica de auto-recuperação. **Não remova** essas proteções.

## 🧪 Como Testar

- **Integridade do Código**: `npm run verify` (Verifica tipos e build).
- **Integridade Visual**: Verificar `App.tsx` e `Login.tsx` se carregam sem erros no console.

## 📦 Estrutura Crítica (NÃO MEXER SEM APROVAÇÃO)

- `services/categoryService.ts`: Lógica de categorias/subcategorias e seeding.
- `services/geminiService.ts`: Integração com IA.
- `types.ts`: Interfaces centrais.

---
*Este arquivo serve como guardião da estabilidade do projeto.*

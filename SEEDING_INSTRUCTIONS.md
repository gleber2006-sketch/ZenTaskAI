# 🌱 Guia de Seeding Manual de Categorias

## Opção 1: Seeding Automático (Recomendado)

O sistema já está configurado para criar as categorias **automaticamente** quando você fizer login pela primeira vez.

**Como funciona:**
1. Faça login na aplicação
2. O sistema detecta que você não tem categorias
3. Cria automaticamente as 7 categorias + 35 subcategorias
4. Pronto! As categorias estarão disponíveis

**Não precisa fazer nada manualmente!**

---

## Opção 2: Seeding Manual via Script

Se você quiser popular as categorias **manualmente** antes de fazer login, siga os passos abaixo.

### Passo 1: Obter seu User ID

1. Acesse a aplicação: https://zentask-ai.pages.dev (ou sua URL)
2. Faça login
3. Abra o DevTools (pressione `F12`)
4. Vá para a aba **Console**
5. Digite e execute:
   ```javascript
   firebase.auth().currentUser.uid
   ```
6. Copie o ID que aparecer (ex: `abc123xyz456`)

### Passo 2: Executar o Script

No terminal, execute:

```bash
node seed-categories.js SEU_USER_ID_AQUI
```

**Exemplo:**
```bash
node seed-categories.js abc123xyz456
```

### Passo 3: Verificar no Firebase

1. Acesse: https://console.firebase.google.com/project/zentask-ai/firestore
2. Verifique as collections:
   - `categories` → deve ter 7 documentos
   - `subcategories` → deve ter 35 documentos

---

## Opção 3: Seeding Manual via Firebase Console

Se preferir criar manualmente via interface do Firebase:

### 1. Acessar Firestore

https://console.firebase.google.com/project/zentask-ai/firestore

### 2. Criar Collection `categories`

Clique em **"Start collection"** → Nome: `categories`

### 3. Adicionar Categorias

Para cada categoria abaixo, clique em **"Add document"**:

#### Categoria 1: Trabalho
```
Document ID: (auto)
Fields:
  nome: "Trabalho"
  tipo: "system"
  fixa: true
  icone: "💼"
  cor: "bg-blue-500"
  ordem: 0
  ativa: true
  criada_em: (timestamp - now)
  criada_por: "SEU_USER_ID"
```

#### Categoria 2: Estudos
```
Document ID: (auto)
Fields:
  nome: "Estudos"
  tipo: "system"
  fixa: true
  icone: "📚"
  cor: "bg-purple-500"
  ordem: 1
  ativa: true
  criada_em: (timestamp - now)
  criada_por: "SEU_USER_ID"
```

#### Categoria 3: Pessoal
```
Document ID: (auto)
Fields:
  nome: "Pessoal"
  tipo: "system"
  fixa: true
  icone: "👤"
  cor: "bg-green-500"
  ordem: 2
  ativa: true
  criada_em: (timestamp - now)
  criada_por: "SEU_USER_ID"
```

#### Categoria 4: Financeiro
```
Document ID: (auto)
Fields:
  nome: "Financeiro"
  tipo: "system"
  fixa: true
  icone: "💰"
  cor: "bg-emerald-600"
  ordem: 3
  ativa: true
  criada_em: (timestamp - now)
  criada_por: "SEU_USER_ID"
```

#### Categoria 5: Projetos
```
Document ID: (auto)
Fields:
  nome: "Projetos"
  tipo: "system"
  fixa: true
  icone: "🚀"
  cor: "bg-orange-500"
  ordem: 4
  ativa: true
  criada_em: (timestamp - now)
  criada_por: "SEU_USER_ID"
```

#### Categoria 6: Saúde
```
Document ID: (auto)
Fields:
  nome: "Saúde"
  tipo: "system"
  fixa: true
  icone: "❤️"
  cor: "bg-red-500"
  ordem: 5
  ativa: true
  criada_em: (timestamp - now)
  criada_por: "SEU_USER_ID"
```

#### Categoria 7: Rotina
```
Document ID: (auto)
Fields:
  nome: "Rotina"
  tipo: "system"
  fixa: true
  icone: "🔄"
  cor: "bg-slate-500"
  ordem: 6
  ativa: true
  criada_em: (timestamp - now)
  criada_por: "SEU_USER_ID"
```

### 4. Criar Collection `subcategories`

Clique em **"Start collection"** → Nome: `subcategories`

### 5. Adicionar Subcategorias

**IMPORTANTE:** Você precisa do `categoria_id` de cada categoria criada acima.

Para cada subcategoria, use este formato:

```
Document ID: (auto)
Fields:
  categoria_id: "ID_DA_CATEGORIA_PAI"
  nome: "Nome da Subcategoria"
  ordem: 0
  ativa: true
```

#### Subcategorias de Trabalho (5):
1. Tarefas operacionais
2. Reuniões
3. Demandas urgentes
4. Planejamento
5. Follow-ups

#### Subcategorias de Estudos (5):
1. Aulas
2. Leituras
3. Exercícios
4. Projetos acadêmicos
5. Revisões

#### Subcategorias de Pessoal (5):
1. Família
2. Social
3. Lazer
4. Casa
5. Compromissos

#### Subcategorias de Financeiro (5):
1. Contas a pagar
2. Contas a receber
3. Planejamento financeiro
4. Investimentos
5. Orçamento

#### Subcategorias de Projetos (5):
1. Projetos ativos
2. Projetos pausados
3. Projetos finalizados
4. Ideias
5. Backlog

#### Subcategorias de Saúde (5):
1. Treinos
2. Consultas
3. Hábitos
4. Rotina alimentar
5. Bem-estar

#### Subcategorias de Rotina (5):
1. Manhã
2. Tarde
3. Noite
4. Semanal
5. Mensal

---

## ✅ Verificação

Após executar qualquer método acima:

1. Acesse a aplicação
2. Clique em "Nova Tarefa"
3. Verifique se o dropdown de Categoria mostra as 7 categorias
4. Selecione uma categoria
5. Verifique se o dropdown de Subcategoria carrega as opções corretas

---

## 🆘 Problemas Comuns

### Categorias não aparecem no dropdown

**Causa:** User ID incorreto ou categorias criadas para outro usuário

**Solução:** Verifique se o `criada_por` nas categorias corresponde ao seu User ID atual

### "Missing index" no console

**Solução:** Firestore mostrará um link no erro. Clique para criar o índice automaticamente.

### Subcategorias não carregam

**Causa:** `categoria_id` incorreto

**Solução:** Verifique se o `categoria_id` nas subcategorias corresponde ao ID real da categoria pai no Firestore.

---

## 💡 Recomendação

**Use a Opção 1 (Automático)**! É mais rápido, seguro e não requer intervenção manual. O sistema já está configurado para fazer tudo automaticamente quando você fizer login.

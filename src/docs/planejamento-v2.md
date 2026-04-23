# PLANEJAMENTO — Sistema de Gestão Universal v2.0

## CONTEXTO DO PROJETO

Este é um projeto **novo**, construído do zero em React + Base44.
O projeto anterior (v1.0) era focado em oficinas automotivas e tinha os seguintes problemas:
- Arquivos com 1000+ linhas
- `window.confirm()` em múltiplas páginas
- Dependência de backend functions pagas
- Referências hardcoded ao segmento automotivo (veículo, placa, relógio de ponto, oficina)
- Mistura de padrões (useState + React Query sem consistência)
- Tabelas quebradas em mobile
- Lógica de negócio frágil no frontend

---

## REGRAS ABSOLUTAS — NUNCA VIOLAR

1. **Zero backend functions** — tudo funciona só com `base44.entities.*`
2. **Máximo 300 linhas por arquivo**
3. **Zero `window.confirm()`, `window.alert()`, `alert()`** — usar sempre `ConfirmDialog` + `useConfirm()`
4. **Zero referências a segmento específico**: sem veículo, placa, oficina, relógio de ponto, EnNo, retifica
5. **Padronizar React Query** (`useQuery` + `useMutation`) em todos os módulos
6. **Todas as páginas responsivas** — mobile (375px) e desktop
7. **Toda tabela tem versão card para mobile**
8. **Toda página usa**: `PageHeader`, `KpiCard`, `EmptyState`, `LoadingState`
9. **Um componente por arquivo**
10. **Nenhuma lógica de negócio inline no JSX** — extrair para hooks ou funções

---

## TERMINOLOGIA (substituições obrigatórias)

| v1.0 (proibido) | v2.0 (correto) |
|---|---|
| Ordem de Serviço / OS | Atendimento |
| Orçamento | Proposta |
| Funcionário | Colaborador |
| Cliente (isolado) | Contato |
| Fornecedor (isolado) | Contato (tipo: fornecedor) |
| Veículo / Ativo automotivo | Ativo (genérico) |
| Relógio de Ponto / EnNo | (removido) |
| Retifica / Oficina | (removido) |

---

## ESTRUTURA DE MÓDULOS

```
Sistema de Gestão Universal
├── 📊 Dashboard
├── 🔧 Operacional
│   ├── Atendimentos (ex-OS)
│   ├── Propostas (ex-Orçamentos)
│   └── Inventário (ex-Estoque)
├── 🗂️ Cadastros
│   ├── Contatos (Clientes + Fornecedores unificados)
│   ├── Produtos
│   └── Serviços
├── 👥 Pessoas
│   ├── Colaboradores (ex-Funcionários)
│   ├── Folha de Pagamento
│   └── Adiantamentos
├── 💰 Financeiro
│   ├── Movimentações
│   ├── Contas a Pagar
│   ├── Contas a Receber
│   └── Fluxo de Caixa
└── ⚙️ Administração
    ├── Usuários e Permissões
    └── Configurações
```

---

## ESTRUTURA DE ARQUIVOS

```
src/
├── pages/
│   ├── Dashboard.jsx
│   ├── operacional/
│   │   ├── Atendimentos.jsx
│   │   ├── Propostas.jsx
│   │   └── Inventario.jsx
│   ├── cadastros/
│   │   ├── Contatos.jsx
│   │   ├── Produtos.jsx
│   │   └── Servicos.jsx
│   ├── pessoas/
│   │   ├── Colaboradores.jsx
│   │   ├── FolhaPagamento.jsx
│   │   └── Adiantamentos.jsx
│   ├── financeiro/
│   │   ├── Movimentacoes.jsx
│   │   ├── ContasPagar.jsx
│   │   ├── ContasReceber.jsx
│   │   └── FluxoCaixa.jsx
│   └── admin/
│       ├── Usuarios.jsx
│       └── Configuracoes.jsx
│
├── components/
│   ├── shared/
│   │   ├── PageHeader.jsx      ← cabeçalho padrão de todas as páginas
│   │   ├── DataTable.jsx       ← tabela universal com filtros e paginação
│   │   ├── KpiCard.jsx         ← card de indicador padrão
│   │   ├── ConfirmDialog.jsx   ← substitui window.confirm() em todo o sistema
│   │   ├── StatusBadge.jsx     ← badge de status universal
│   │   ├── EmptyState.jsx      ← estado vazio padronizado
│   │   └── LoadingState.jsx    ← carregamento padronizado
│   ├── forms/
│   │   ├── ContatoForm.jsx
│   │   ├── ProdutoForm.jsx
│   │   ├── ServicoForm.jsx
│   │   ├── AtendimentoForm.jsx
│   │   ├── PropostaForm.jsx
│   │   ├── ColaboradorForm.jsx
│   │   ├── FolhaPagamentoForm.jsx
│   │   ├── AdiantamentoForm.jsx
│   │   └── MovimentacaoForm.jsx
│   └── viewers/
│       ├── AtendimentoViewer.jsx
│       ├── PropostaViewer.jsx
│       └── MovimentacaoViewer.jsx
│
├── hooks/
│   ├── useConfirm.js           ← abre ConfirmDialog (substitui window.confirm)
│   ├── usePermissions.js       ← hook de permissões
│   └── useEntidade.js          ← hook genérico CRUD
│
└── lib/
    ├── formatters.js           ← formatCurrency, formatDate, etc.
    ├── validators.js           ← validações de CPF, CNPJ, email
    └── constants.js            ← listas de UFs, bancos, regimes, etc.
```

---

## ENTIDADES DO BANCO DE DADOS

### Contato (substitui Cliente + Fornecedor)
```json
{
  "nome": "string (required)",
  "tipo": ["cliente", "fornecedor", "ambos"],
  "cpf_cnpj": "string",
  "email": "string",
  "telefone": "string",
  "telefone2": "string",
  "cep": "string",
  "logradouro": "string",
  "numero": "string",
  "complemento": "string",
  "bairro": "string",
  "cidade": "string",
  "uf": "string",
  "categoria": "string",
  "observacoes": "string",
  "ativo": "boolean (default: true)"
}
```

### Produto
```json
{
  "codigo": "string (required)",
  "nome": "string (required)",
  "descricao": "string",
  "categoria_id": "string",
  "unidade": "string (default: UN)",
  "preco_custo": "number",
  "preco_venda": "number (required)",
  "estoque_atual": "number (default: 0)",
  "estoque_minimo": "number (default: 0)",
  "ativo": "boolean (default: true)"
}
```

### Servico
```json
{
  "codigo": "string",
  "nome": "string (required)",
  "descricao": "string",
  "categoria_id": "string",
  "unidade": "string (default: UN)",
  "preco": "number (required)",
  "ativo": "boolean (default: true)"
}
```

### Atendimento (substitui OrdemServico)
```json
{
  "numero": "string",
  "proposta_id": "string",
  "contato_id": "string (required)",
  "responsavel_id": "string",
  "vendedor_id": "string",
  "data_abertura": "date (required)",
  "data_conclusao": "date",
  "status": ["aberto", "em_andamento", "concluido", "cancelado"],
  "itens": "array",
  "desconto_tipo": ["valor", "percentual"],
  "desconto_valor": "number (default: 0)",
  "outras_despesas": "number (default: 0)",
  "valor_total": "number",
  "observacoes": "string",
  "forma_pagamento_id": "string",
  "condicao_pagamento_id": "string",
  "financeiro_gerado": "boolean (default: false)"
}
```

### Proposta (substitui Orcamento)
```json
{
  "numero": "string",
  "contato_id": "string (required)",
  "responsavel_id": "string",
  "data_emissao": "date (required)",
  "data_validade": "date",
  "itens": "array",
  "desconto_tipo": ["valor", "percentual"],
  "desconto_valor": "number (default: 0)",
  "outras_despesas": "number (default: 0)",
  "valor_total": "number",
  "status": ["rascunho", "enviada", "aprovada", "rejeitada", "expirada", "cancelada"],
  "observacoes": "string",
  "forma_pagamento_id": "string",
  "condicao_pagamento_id": "string"
}
```

### Colaborador (substitui Funcionario)
```json
{
  "nome": "string (required)",
  "cpf": "string",
  "email": "string",
  "telefone": "string",
  "data_admissao": "date (required)",
  "data_demissao": "date",
  "cargo_id": "string",
  "departamento_id": "string",
  "salario": "number (required)",
  "regime": ["clt", "pj", "autonomo", "estagio", "temporario"],
  "status": ["ativo", "ferias", "afastado", "desligado"],
  "banco": "string",
  "agencia": "string",
  "conta": "string",
  "tipo_conta": ["corrente", "poupanca", "salario"],
  "pix": "string",
  "observacoes": "string",
  "usuario_id": "string"
}
```

### FolhaPagamento
```json
{
  "colaborador_id": "string (required)",
  "competencia": "string (AAAA-MM, required)",
  "salario_base": "number",
  "comissoes": "number (default: 0)",
  "horas_extras": "number (default: 0)",
  "bonus": "number (default: 0)",
  "outras_entradas": "number (default: 0)",
  "adiantamentos": "number (default: 0)",
  "faltas": "number (default: 0)",
  "encargos": "number (default: 0)",
  "outras_saidas": "number (default: 0)",
  "total_entradas": "number",
  "total_saidas": "number",
  "salario_liquido": "number (required)",
  "data_pagamento": "date",
  "status": ["pendente", "pago_parcial", "pago"],
  "plano_contas_id": "string",
  "conta_bancaria_id": "string",
  "observacoes": "string"
}
```

### Adiantamento
```json
{
  "colaborador_id": "string (required)",
  "data": "date (required)",
  "competencia": "string",
  "valor": "number (required)",
  "valor_pago": "number (default: 0)",
  "motivo": "string",
  "status": ["pendente", "aprovado", "pago", "cancelado"],
  "plano_contas_id": "string",
  "conta_bancaria_id": "string",
  "observacoes": "string"
}
```

### MovimentacaoFinanceira
```json
{
  "tipo": ["receita", "despesa"],
  "contato_id": "string",
  "historico": "string (required)",
  "numero_documento": "string",
  "data_emissao": "date (required)",
  "data_vencimento": "date (required)",
  "valor_total": "number (required)",
  "desconto": "number (default: 0)",
  "parcelas": "array",
  "status": ["pendente", "pago", "parcial", "vencido", "cancelado"],
  "plano_contas_id": "string",
  "conta_bancaria_id": "string",
  "forma_pagamento_id": "string",
  "data_baixa": "date",
  "origem": ["manual", "atendimento", "proposta", "folha", "adiantamento"],
  "origem_id": "string",
  "observacoes": "string"
}
```

### ContasPagar
```json
{
  "contato_id": "string",
  "plano_contas_id": "string",
  "descricao": "string (required)",
  "numero_documento": "string",
  "data_vencimento": "date (required)",
  "data_pagamento": "date",
  "competencia": "string",
  "valor_original": "number (required)",
  "valor_pago": "number",
  "juros_multa": "number (default: 0)",
  "desconto": "number (default: 0)",
  "status": ["pendente", "pago", "vencido", "cancelado"],
  "observacoes": "string"
}
```

### ContasReceber
```json
{
  "contato_id": "string",
  "plano_contas_id": "string",
  "atendimento_id": "string",
  "descricao": "string (required)",
  "numero_documento": "string",
  "data_vencimento": "date (required)",
  "data_recebimento": "date",
  "competencia": "string",
  "valor_original": "number (required)",
  "valor_recebido": "number",
  "juros_multa": "number (default: 0)",
  "desconto": "number (default: 0)",
  "status": ["pendente", "recebido", "vencido", "cancelado"],
  "observacoes": "string"
}
```

### ContaBancaria
```json
{
  "nome": "string (required)",
  "banco": "string",
  "agencia": "string",
  "conta": "string",
  "tipo": ["corrente", "poupanca", "caixa", "investimento"],
  "saldo_inicial": "number (default: 0)",
  "ativo": "boolean (default: true)"
}
```

### PlanoContas
```json
{
  "codigo": "string (required)",
  "nome": "string (required)",
  "tipo": ["receita", "despesa", "ativo", "passivo"],
  "categoria_id": "string",
  "ativa": "boolean (default: true)"
}
```

### Categoria
```json
{
  "nome": "string (required)",
  "tipo": ["produto", "servico", "despesa", "receita"],
  "cor": "string",
  "icone": "string"
}
```

### Configuracoes
```json
{
  "nome_empresa": "string (required)",
  "cnpj": "string",
  "telefone": "string",
  "email": "string",
  "endereco": "string",
  "logo_url": "string",
  "segmento": "string",
  "plano_contas_padrao_receita": "string",
  "plano_contas_padrao_despesa": "string",
  "bloquear_edicao_com_financeiro": "boolean (default: false)",
  "permitir_multipla_conversao": "boolean (default: false)"
}
```

---

## DESIGN SYSTEM

### Cores
```
Primária:       #1A56DB
Primária dark:  #1343B0
Primária light: #EFF6FF
BG App:         #F1F5F9
BG Sidebar:     #0B1629
BG Card:        #FFFFFF
Success:        #059669
Warning:        #D97706
Error:          #DC2626
Info:           #0EA5E9
Text primary:   #111827
Text secondary: #6B7280
Border:         #E5E7EB
```

### Padrões Visuais Obrigatórios
- Border radius: `rounded-xl` (12px)
- Card: `bg-white shadow-sm border border-slate-200 rounded-xl`
- Padding card: `p-4 md:p-6`
- Gap grid: `gap-3 md:gap-4`
- Botão altura: `h-9 md:h-10`
- Header de tabela: `bg-[#0B1629]` com texto branco
- Confirmações destrutivas: `ConfirmDialog` variant="danger"
- Fonte: 'Outfit', sans-serif

---

## COMPONENTES COMPARTILHADOS OBRIGATÓRIOS

### PageHeader
Todo cabeçalho de página usa este componente:
```jsx
<PageHeader
  title="Atendimentos"
  subtitle="Gestão de projetos e serviços"
  actions={[
    { label: "Novo", icon: Plus, onClick: handleNew, variant: "primary" },
    { label: "Exportar", icon: Download, onClick: handleExport, variant: "outline" }
  ]}
/>
```

### KpiCard
Todo card de indicador usa este componente:
```jsx
<KpiCard
  title="Receita do Mês"
  value="R$ 45.000,00"
  trend="+12% vs mês anterior"
  trendType="up"   // "up" | "down" | "neutral"
  icon={TrendingUp}
  color="green"    // "blue" | "green" | "red" | "yellow" | "purple"
/>
```

### ConfirmDialog + useConfirm
Substitui window.confirm() em TODO o sistema:
```jsx
const { confirm } = useConfirm();

const handleDelete = async (item) => {
  const ok = await confirm({
    title: "Excluir Atendimento",
    description: `O atendimento #${item.numero} será removido permanentemente.`,
    variant: "danger",   // "danger" | "confirm" | "warning"
    confirmLabel: "Sim, excluir",
    cancelLabel: "Cancelar"
  });
  if (ok) await base44.entities.Atendimento.delete(item.id);
};
```

### DataTable
Tabela universal com busca, filtros e paginação:
```jsx
<DataTable
  data={atendimentos}
  columns={columns}
  searchFields={["numero", "contato_nome"]}
  filters={[{ key: "status", label: "Status", options: statusOptions }]}
  onRowClick={handleView}
  emptyState={<EmptyState title="Nenhum atendimento" description="Crie o primeiro." />}
  loading={isLoading}
  mobileCard={(item) => <AtendimentoCard item={item} />}
/>
```

### EmptyState
```jsx
<EmptyState
  title="Nenhum registro encontrado"
  description="Comece criando o primeiro."
  action={{ label: "Criar novo", onClick: handleNew }}
/>
```

### LoadingState
```jsx
<LoadingState message="Carregando atendimentos..." />
```

---

## HOOKS OBRIGATÓRIOS

### useConfirm
```js
// hooks/useConfirm.js
// Retorna função confirm() que abre ConfirmDialog e retorna Promise<boolean>
```

### useEntidade (hook genérico CRUD)
```js
// hooks/useEntidade.js
// Encapsula useQuery + useMutation para qualquer entidade
// Uso: const { data, isLoading, create, update, remove } = useEntidade('Atendimento')
```

---

## PADRÃO DE PÁGINA

Toda página segue este template:

```jsx
export default function AtendimentosPage() {
  // 1. Hooks de dados (React Query)
  // 2. Estados de UI (modal aberto, item selecionado)
  // 3. Handlers (handleNew, handleEdit, handleDelete, etc.)
  // 4. Filtros/ordenação com useMemo
  // 5. Render

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader ... />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard ... />
      </div>
      <DataTable ... />
      {isFormOpen && <AtendimentoForm ... />}
      {isViewerOpen && <AtendimentoViewer ... />}
    </div>
  );
}
```

---

## ROADMAP DE IMPLEMENTAÇÃO

### FASE 1 — BASE (Semana 1-2) — FAZER PRIMEIRO
- [ ] Criar entidades: Contato, Atendimento, Proposta, Colaborador, Produto, Servico, Categoria
- [ ] Criar componentes shared: PageHeader, KpiCard, DataTable, ConfirmDialog, EmptyState, LoadingState, StatusBadge
- [ ] Criar hooks: useConfirm, useEntidade
- [ ] Criar lib: formatters.js, validators.js, constants.js
- [ ] Refatorar App.jsx com nova estrutura de rotas e sidebar universal

### FASE 2 — OPERACIONAL (Semana 3-4)
- [ ] Página Atendimentos (lista + form + viewer)
- [ ] Página Propostas (lista + form + viewer)
- [ ] Página Inventário
- [ ] Integração Proposta → Atendimento
- [ ] Integração Atendimento → Movimentação Financeira

### FASE 3 — CADASTROS (Semana 5)
- [ ] Página Contatos (clientes + fornecedores unificados)
- [ ] Página Produtos
- [ ] Página Serviços
- [ ] Páginas auxiliares (Categorias, Formas Pagamento, Condições)

### FASE 4 — PESSOAS (Semana 6)
- [ ] Página Colaboradores
- [ ] Página Folha de Pagamento
- [ ] Página Adiantamentos

### FASE 5 — FINANCEIRO (Semana 7-8)
- [ ] Página Movimentações Financeiras
- [ ] Página Contas a Pagar
- [ ] Página Contas a Receber
- [ ] Página Fluxo de Caixa

### FASE 6 — ADMINISTRAÇÃO E DASHBOARD (Semana 9)
- [ ] Dashboard universal
- [ ] Página Usuários e Permissões
- [ ] Página Configurações

### FASE 7 — QUALIDADE (Semana 10)
- [ ] Teste mobile completo (375px)
- [ ] Revisão de acessibilidade
- [ ] Otimização de performance

---

## MÉTRICAS DE SUCESSO

| Indicador | Meta |
|---|---|
| Arquivos com mais de 300 linhas | 0 |
| Ocorrências de window.confirm/alert | 0 |
| Páginas que dependem de backend functions | 0 |
| Páginas responsivas em 375px | 100% |
| Referências a segmento automotivo no código | 0 |
| Páginas sem EmptyState/LoadingState | 0 |

---

## PROMPT DE INÍCIO PARA NOVO CHAT

Cole este texto no início de qualquer novo chat para contextualizar o agente:

---

Estou trabalhando no projeto **Sistema de Gestão Universal v2.0**.
Leia o arquivo `docs/planejamento-v2.md` para entender todas as regras, entidades, estrutura e roadmap antes de qualquer implementação.
Regras críticas: zero backend functions, máximo 300 linhas por arquivo, zero window.confirm(), terminologia universal (Atendimento, Proposta, Colaborador, Contato), React Query em tudo, mobile-first.

---
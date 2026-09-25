# Controle Motofrete

App web para controle de receitas e despesas de motofrete (delivery via iFood/99Food), com armazenamento em nuvem via [JSONBin.io](https://jsonbin.io) e deploy no Netlify.

**Stack**: HTML + CSS + JavaScript vanilla (zero dependências de build). PWA-ready, mobile-first, funciona offline via cache local.

---

## Índice

- [Funcionalidades](#funcionalidades)
- [Como usar](#como-usar)
- [Setup completo](#setup-completo)
- [Arquitetura](#arquitetura)
- [Modelo de dados](#modelo-de-dados)
- [Lógica de cálculo](#lógica-de-cálculo)
- [Estratégia de sincronização](#estratégia-de-sincronização)
- [Segurança](#segurança)
- [Desenvolvimento local](#desenvolvimento-local)
- [Deploy no Netlify](#deploy-no-netlify)
- [Solução de problemas](#solução-de-problemas)

---

## Funcionalidades

### Lançamentos
- CRUD completo: adicionar, editar, excluir
- Filtros por mês e por tipo (Receita/Despesa/Controle)
- Layout de card em telas muito estreitas
- Botão flutuante (FAB) no mobile para adicionar rápido
- Auto-preenchimento inteligente por categoria (ex: Folga esconde campos irrelevantes)

### Resumo Semanal
Tabela com Mês × Semana mostrando:
- Receita bruta, Combustível, Manutenção, Outras despesas
- Total de despesas, Lucro líquido, Valor guardado
- Status colorido: **Meta Batida** (verde) / **Meta Mínima** (amarelo) / **Abaixo** (vermelho) / **Sem movimento** (cinza)

### Resumo Mensal
- Cards com totais gerais (Receita, Despesa, Líquido, Combustível, Manutenção, Dias com faturamento, Média por lançamento, Guardado, Meta Reserva, Saldo Reserva)
- Tabela por mês com os mesmos indicadores + status de reserva

### Configurações
- Editar metas: semanal, mínima, reserva diária
- Editar listas de apps e categorias
- Testar/salvar credenciais JSONBin
- Sincronizar manualmente com a nuvem
- Exportar/importar backup JSON
- Carregar dados iniciais (238 lançamentos históricos do Excel original)
- Instruções de instalação PWA (detecta iOS/Android)
- Logout
- Apagar todos os lançamentos

### Exportação
- **Excel** (`.xlsx`) via SheetJS
- **PDF** paisagem via jsPDF + autoTable
- Escopo: lançamentos, resumo semanal, resumo mensal ou tudo em um só arquivo
- No iOS usa Web Share API (compartilha via Files/Drive/WhatsApp/etc.)
- No Android/Desktop faz download direto

### PWA
- Instalável na tela inicial (iOS via Safari, Android via Chrome)
- Ícone SVG próprio (bike em quadrado azul)
- Roda em modo standalone (sem barra do navegador)
- Cache local permite abrir offline

---

## Como usar

### Fluxo normal do dia a dia

1. Abre o app (na URL do Netlify ou pelo ícone instalado)
2. Se pediu login: usuário + senha (padrão: `lucas` / `lucas123`, editável em `js/credentials.js`)
3. Vai pra aba **Lançamentos** e clica no botão flutuante `+` (mobile) ou `+ Novo` (desktop)
4. Preenche:
   - **Data** (padrão: hoje)
   - **Categoria** → tipo é auto-selecionado (Entrega vira Receita, Combustível vira Despesa, etc.)
   - **Valor** em R$
   - Opcional: App (iFood/99Food), Km rodados, Valor guardado, Descrição, Observação
5. Clica em **Salvar**
   - App sincroniza com a nuvem primeiro (evita conflitos entre dispositivos)
   - Depois grava o novo lançamento
6. Volta ao Resumo Semanal ou Mensal pra ver os cálculos atualizados

### Marcar dia de folga
Ao escolher categoria **Folga**, o formulário simplifica:
- Tipo vira `Controle` automático
- Campos Valor, App, Km, Guardado somem (não fazem sentido)
- Descrição vira "Dia de folga"

### Trocar entre dispositivos
Se você usa o app no celular e no PC:
1. Antes de mexer no segundo dispositivo, clica no botão de sincronizar 🔄 no header
2. Isso baixa a versão mais recente da nuvem
3. Agora pode adicionar/editar sem perder o que fez no outro

---

## Setup completo

### 1. JSONBin.io (armazenamento em nuvem grátis)

1. Cria conta em https://jsonbin.io
2. Menu lateral → **API Keys** → copia a `X-MASTER-KEY` (começa com `$2a$10$...`)
3. Menu lateral → **Bins** → **Create Bin**
4. Cola `{}` no editor e clica em **Create**
5. Copia o **Bin ID** que aparece na URL (24 caracteres hex, tipo `6ab686afac6210605af481d0`)

### 2. Configurar credenciais no app

Edita `js/credentials.js`:

```js
const CREDENTIALS = {
  binId: 'SEU_BIN_ID_AQUI',
  masterKey: 'SUA_MASTER_KEY_AQUI',
  loginUser: 'seu_usuario',
  loginPass: 'sua_senha'
};
```

**⚠️ Importante**: essas credenciais ficam visíveis no código-fonte do browser (F12 → Sources). Isso vale para:
- Qualquer pessoa que abrir a URL do site
- Qualquer clone do repo GitHub

Use apenas se o app for privado e a URL não for compartilhada.

### 3. Deploy

Ver seção [Deploy no Netlify](#deploy-no-netlify).

### 4. Primeira visita

- App pede login (usa `loginUser`/`loginPass` do `credentials.js`)
- Depois de logar, tenta carregar do JSONBin
- Bin vazio? Vai pra aba **Config** → clica em **"Carregar dados iniciais do Excel"** para popular com 238 lançamentos históricos

---

## Arquitetura

App SPA vanilla (sem framework, sem build). Arquivos servidos estaticamente.

### Estrutura de arquivos

```
despesas/
├── index.html              # Estrutura + 3 telas: login, setup, app
├── styles.css              # Estilo (dark/light auto, mobile-first)
├── favicon.svg             # Ícone SVG (bike em azul)
├── manifest.json           # PWA manifest
├── netlify.toml            # Config Netlify (headers de cache)
├── .gitignore
├── README.md               # Este arquivo
└── js/
    ├── credentials.js      # Bin ID + Master Key + login (hardcoded)
    ├── auth.js             # Login/logout + gate de acesso
    ├── icons.js            # 16 ícones SVG inline (Lucide-style)
    ├── seed-data.js        # 238 lançamentos do Excel original
    ├── storage.js          # Wrapper JSONBin (GET/PUT) + cache local
    ├── resumos.js          # Cálculos (semanal, mensal, totais)
    ├── resumos-ui.js       # Renderização das tabelas de resumo
    ├── lancamentos.js      # CRUD lançamentos + modal + sync pré-save
    ├── config-ui.js        # Tela de configurações
    ├── export.js           # Excel/PDF (lazy-loaded via CDN)
    └── app.js              # Bootstrap, estado global, roteamento
```

### Ordem de carregamento

```html
<script src="js/credentials.js"></script>
<script src="js/auth.js"></script>
<script src="js/icons.js"></script>
<script src="js/seed-data.js"></script>
<script src="js/storage.js"></script>
<script src="js/resumos.js"></script>
<script src="js/resumos-ui.js"></script>
<script src="js/lancamentos.js"></script>
<script src="js/config-ui.js"></script>
<script src="js/export.js"></script>
<script src="js/app.js"></script>
```

Todos scripts clássicos (sem `type="module"`) para funcionar via `file://` também.

Cache-busting via `?v=N` no HTML — bump manual quando muda JS/CSS.

### Fluxo de bootstrap

```
DOMContentLoaded
  ↓
injectIcons() [substitui data-icon por SVG]
bindSyncStatus() [wire do indicador]
bindSetup() bindTabs() initLancamentosUI() initConfigUI() initExportUI() initLoginUI()
  ↓
isLoggedIn()?
  ├── não → mostra login-screen
  └── sim → startAppAfterAuth()
              ↓
              tem CREDENTIALS (bin+key)?
              ├── sim → saveCreds + bootstrapApp()
              └── não → showSetup() (pede bin+key)
                          ↓
                          após setup OK → bootstrapApp()

bootstrapApp():
  cache local existe?
    ├── sim → aplica cache, marca "Local (X min atrás)", 0 requests
    └── não → GET no JSONBin, aplica, marca "Baixado"
```

---

## Modelo de dados

O JSON armazenado no JSONBin tem esta forma:

```json
{
  "version": 1,
  "config": {
    "metaSemanal": 570,
    "metaMinima": 470,
    "metaReservaDiaria": 10,
    "apps": ["iFood", "99Food", "iFood/99Food (junto)"],
    "tipos": ["Receita", "Despesa", "Controle"],
    "categorias": ["Entrega", "Combustivel", "Manutencao", "Alimentacao", "Folga", "Bonus", "Gorjeta", "Outros"]
  },
  "lancamentos": [
    {
      "id": "l-1727280000000-abc123",
      "data": "2026-03-01",
      "mes": "Março",
      "semana": "Semana 1",
      "diaSemana": "Seg",
      "app": "iFood",
      "tipo": "Receita",
      "categoria": "Entrega",
      "descricao": "Faturamento do dia",
      "valor": 136.00,
      "km": null,
      "observacao": "",
      "referencia": "Diario",
      "valorGuardado": 0
    }
  ]
}
```

### Campos do lançamento

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | string | sim | Identificador único (auto-gerado) |
| `data` | ISO date `YYYY-MM-DD` | sim | Data do lançamento |
| `mes` | string | derivado | Nome do mês em português (auto-calculado da data) |
| `semana` | string | derivado | "Semana 1" a "Semana 5" (auto-calculado) |
| `diaSemana` | string | derivado | "Dom", "Seg", ..., "Sab" (auto-calculado) |
| `app` | string \| null | não | Nome do app (iFood, 99Food, etc.) |
| `tipo` | enum | sim | "Receita", "Despesa" ou "Controle" |
| `categoria` | string | sim | Uma das categorias configuradas |
| `descricao` | string \| null | não | Descrição livre |
| `valor` | number | sim (≥0) | Valor em R$ |
| `km` | number \| null | não | Km rodados |
| `observacao` | string \| null | não | Observação livre |
| `referencia` | enum | não | "Diario" ou "Semanal" |
| `valorGuardado` | number | não (≥0) | Valor separado para reserva |

### Cache local (localStorage)

| Chave | Conteúdo |
|---|---|
| `motofrete.creds` | `{binId, masterKey}` (após setup ou vindo de CREDENTIALS) |
| `motofrete.cache` | Cópia completa do JSON do JSONBin |
| `motofrete.syncedAt` | ISO timestamp da última sincronização com JSONBin |
| `motofrete.auth` | `"1"` se logado |

---

## Lógica de cálculo

### Derivação de mês/semana/dia a partir da data

```
data = "2026-03-15"
mes = MESES[3-1] = "Março"
diaSemana = DIAS_SEMANA[new Date().getDay()] = "Dom"
semana = "Semana " + ceil((dia + offset_1o_dia_do_mes) / 7), max 5
```

### Resumo Semanal (por Mês × Semana)

```
Receita        = Σ valor onde tipo=Receita
Combustível    = Σ valor onde tipo=Despesa & categoria=Combustivel
Manutenção     = Σ valor onde tipo=Despesa & categoria=Manutencao
Outras         = Σ valor onde tipo=Despesa & categoria∉{Combustivel, Manutencao}
Total Despesas = Combustível + Manutenção + Outras
Lucro Líquido  = Receita - Total Despesas
Guardado       = Σ valorGuardado

Meta Reserva Semanal = (dias com faturamento na semana) × metaReservaDiaria

Status =
  Receita = 0                     → "Sem movimento"
  Receita ≥ metaSemanal (570)     → "Meta Batida"
  Receita ≥ metaMinima  (470)     → "Meta Mínima Batida"
  Receita <  metaMinima           → "Abaixo da Meta"
```

### Resumo Mensal (por Mês)

Análogo ao semanal, mais:
```
Média/lançamento     = Receita / qtd lançamentos com tipo=Receita
Dias com faturamento = |{ data única com valor Receita > 0 }|
Meta Reserva Mensal  = dias com faturamento × metaReservaDiaria
Diferença Reserva    = Guardado - Meta Reserva
Status Reserva       = Diferença ≥ 0 ? "Meta Batida" : "Abaixo da Meta"
```

### Totais Gerais (todo o histórico)

Soma tudo, mais contagem de dias de folga (`tipo=Controle & categoria=Folga`) para exibir no dashboard mensal.

---

## Estratégia de sincronização

### Modelo cache-first

Objetivo: minimizar requests ao JSONBin (limite grátis: 10.000/mês).

**Ao abrir o app**:
- Se tem cache local → usa, **0 requests**
- Se não tem → GET no JSONBin, salva no cache

**Ao adicionar/editar/excluir lançamento** (2 requests):
1. **GET** no JSONBin → puxa a versão mais atual (evita sobrescrever mudanças de outros dispositivos)
2. Aplica a alteração local em cima
3. **PUT** no JSONBin → grava

**Ao mudar config** (1 request):
- PUT direto (menos crítico, poucas mudanças)

**Botão de sync no header**:
- Flush pendentes → GET → aplica → renderiza

### Debounce de saves

Alterações de config disparam `scheduleSave` com debounce de 800ms — várias mudanças em sequência viram um PUT só.

### Fallback offline

Se GET/PUT falha:
- App usa cache local
- Exibe status "Erro" no header
- Retry na próxima operação

### Consumo estimado

| Uso típico | Requests/mês |
|---|---|
| 10 aberturas/dia (cache hit) | 0 |
| 5 lançamentos/dia (GET+PUT) | ~300 |
| 2 edições/dia | ~120 |
| Sync manual ocasional | ~30 |
| **Total** | **~450** |

Bem folgado dentro dos 10.000 grátis.

---

## Segurança

### O que ESTÁ protegido
- Login em tela (usuário/senha) impede acesso casual
- HTTPS via Netlify (dados em trânsito criptografados)
- Cache local só no navegador da pessoa logada

### O que NÃO está protegido
- **Credenciais visíveis no código-fonte** (F12 → Sources → credentials.js) — qualquer pessoa com acesso à URL pode ler:
  - Bin ID + Master Key do JSONBin
  - Usuário + senha do login
- **Master Key dá acesso a TODOS os bins da conta JSONBin**, não só a esse
- **Sem controle de sessão** — se você emprestar o dispositivo, o próximo usuário fica logado

### Recomendações
- Trate como app **pessoal e privado** — não compartilhe a URL do Netlify
- Se o repo GitHub for público, considere:
  - Usar **Access Keys** do JSONBin (limitadas a um bin específico)
  - Ou revogar/rotacionar credenciais periodicamente
- Para segurança real (multi-usuário, controle de acesso), migre para Firebase Auth ou Supabase Auth com backend

---

## Desenvolvimento local

### Requisitos
- Um navegador moderno (Chrome/Safari/Firefox)
- Opcional: servidor HTTP local (Python, Node) para evitar limitações do `file://`

### Rodar
```bash
cd despesas

# Opção A: abrir direto (funciona por causa dos scripts clássicos)
# Duplo-clique em index.html

# Opção B: servidor local (recomendado para PWA/manifest)
python -m http.server 8000
# ou
npx serve .

# Acessar http://localhost:8000
```

### Modificar credenciais para testes
Edita `js/credentials.js` com suas credenciais. Após editar, dá hard-refresh (Ctrl+Shift+R) pra invalidar cache.

### Adicionar novos ícones
Edita `js/icons.js`, adiciona uma entrada no objeto `ICONS`:
```js
meuIcone: `<svg ${SVG_ATTRS}>...paths...</svg>`
```
E usa via `data-icon="meuIcone"` no HTML ou `icon('meuIcone')` no JS.

### Adicionar campos ao lançamento
1. Adiciona input no modal em `index.html` (dentro `#form-lancamento`)
2. Atualiza `submitForm()` em `js/lancamentos.js` pra ler e persistir
3. Atualiza `openModal()` pra preencher ao editar
4. Se precisa mostrar na tabela: atualiza `renderLancamentos()`
5. Se afeta cálculo: atualiza `js/resumos.js`

### Debug
- F12 → Console → objeto global `state.data` mostra tudo em memória
- `state.data.lancamentos` = array de lançamentos
- `state.data.config` = configurações
- Digitar `sincronizarDaNuvem()` no console força um sync manual

---

## Deploy no Netlify

### Opção 1: Drag & Drop (mais rápido)
1. Ir em https://app.netlify.com/drop
2. Arrastar a pasta `despesas/` inteira
3. Site fica online em ~30s, URL tipo `nome-aleatorio.netlify.app`

### Opção 2: Conectado ao GitHub (auto-deploy)
1. Push do código pro GitHub
2. Netlify → **Add new site** → **Import from Git** → seleciona o repo
3. Build settings: deixa vazio, publish directory = `.`
4. **Deploy** → toda vez que você fizer `git push`, o Netlify redeploya automaticamente

### Configurações no netlify.toml

```toml
# HTML nunca cacheia (garante que ?v=N novo seja lido)
[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"

# JS/CSS cacheiam 5 min (invalidação via ?v=N no HTML)
[[headers]]
  for = "/js/*"
  [headers.values]
    Cache-Control = "public, max-age=300"

# Segurança básica
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### Domínio customizado
Netlify → Site settings → **Domain management** → **Add custom domain**.

---

## Solução de problemas

### "Erro ao carregar do JSONBin: HTTP 404"
Bin ID errado ou bin não existe. Verifique:
- Que copiou o Bin ID correto (24 caracteres hex, sem espaços)
- Que o bin ainda existe na sua conta JSONBin

### "Erro ao carregar do JSONBin: HTTP 401 / 403"
Master Key errada ou revogada. Gere uma nova em jsonbin.io → API Keys.

### Login não funciona
- Verifica se `credentials.js` foi atualizado
- Hard refresh (Ctrl+Shift+R) pra invalidar cache
- No F12 → Console, digita `CREDENTIALS` — deve mostrar seus valores atuais

### FAB (+) aparecendo em telas erradas
Cache antigo do CSS. Hard refresh. Se persistir, bump `?v=N` no `index.html`.

### Dados perdidos ao trocar de dispositivo
1. Verifica que ambos apontam pro mesmo `binId`
2. Antes de editar no segundo dispositivo, clica no botão de sync 🔄 do header
3. Se perdeu dados: os últimos backups estão em `motofrete.cache` no localStorage — pode restaurar exportando manualmente pelo DevTools

### App carrega em branco
- F12 → Console → veja o erro
- Comum: `credentials.js` retornou 404 → não foi upado no deploy
- Ou: navegador bloqueia `file://` — use servidor HTTP local

### Exportação PDF/Excel não funciona
- Precisa de internet (bibliotecas SheetJS/jsPDF são carregadas via CDN sob demanda)
- No iOS: usa Web Share API → abre folha de compartilhamento em vez de baixar direto
- No Android/Desktop: baixa o arquivo direto

### "Sync falhou, salvando mesmo assim"
Sem internet. O app salva localmente e vai tentar sincronizar depois. Não perde dados.

---

## Créditos

Dados iniciais extraídos da planilha `CONTROLE20-20RESERVA.xlsx` do usuário.
Ícones no estilo [Lucide](https://lucide.dev/) (linhas SVG stroke-2).
JSONBin.io para storage, Netlify para hosting.

App gerado com auxílio de [Claude Code](https://claude.com/claude-code).

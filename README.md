# 🛵 Controle Motofrete

App web de controle de receitas/despesas de motofrete (iFood/99Food), com armazenamento em nuvem grátis via [JSONBin.io](https://jsonbin.io) e deploy no Netlify.

## Recursos

- ✅ Lançamentos diários e semanais (receita, despesa, controle)
- ✅ Resumo semanal por mês com metas (padrão / mínima)
- ✅ Resumo mensal com totais gerais e meta de reserva
- ✅ Categorias e apps configuráveis
- ✅ Backup em JSON (exportar/importar)
- ✅ Dados iniciais opcionais (238 lançamentos históricos do Excel original)
- ✅ Salvamento automático na nuvem (JSONBin)
- ✅ Cache local caso fique offline
- ✅ Mobile-first (funciona bem no celular)

## Deploy no Netlify

### Opção 1 — Drag & drop
1. Vá em https://app.netlify.com/drop
2. Arraste a pasta `despesas/` inteira

### Opção 2 — GitHub
1. Suba o repositório no GitHub
2. Em Netlify: **Add new site → Import from Git → Selecione o repo**
3. Build settings: deixe vazio (publish directory: `.`)
4. Deploy

## Setup do JSONBin (primeira vez)

1. Crie conta grátis em https://jsonbin.io
2. Em **API Keys**, copie sua `X-MASTER-KEY`
3. Em **Create Bin**, cole `{}` como conteúdo e crie
4. Copie o **Bin ID** da URL (parte depois de `/b/`)
5. Abra o app: cole ambos os campos na tela de setup e clique em **Salvar e entrar**
6. (Opcional) Na aba **Config**, clique em **Carregar dados iniciais do Excel** para popular com os 238 lançamentos históricos

## Estrutura de arquivos

```
despesas/
├── index.html          # Estrutura HTML + tabs
├── styles.css          # Estilo (dark/light auto)
├── js/
│   ├── app.js          # Bootstrap, estado global, roteamento
│   ├── storage.js      # Wrapper JSONBin (GET/PUT) + cache local
│   ├── lancamentos.js  # CRUD de lançamentos + modal
│   ├── resumos.js      # Cálculos (semanal/mensal/totais)
│   ├── resumos-ui.js   # Renderização das tabelas de resumo
│   ├── config-ui.js    # Tela de configurações
│   └── seed-data.js    # Dados iniciais do Excel
├── netlify.toml        # Config Netlify (headers)
└── README.md
```

## Rodando localmente

```bash
# Precisa de um servidor HTTP (por causa dos ES modules)
python -m http.server 8000
# ou
npx serve .
```

Acesse http://localhost:8000

## Segurança

- Suas credenciais JSONBin ficam **apenas no localStorage** do navegador — nunca são commitadas
- Cada dispositivo/navegador precisa configurar a conexão uma vez
- Para usar em outro dispositivo, use as **mesmas credenciais** JSONBin → dados sincronizam
- Para outro usuário sem acesso aos seus dados, ele deve criar seu próprio bin

## Limites do JSONBin grátis

- 10.000 requests/mês (mais que suficiente pra uso pessoal)
- 100KB por bin (comporta ~5000 lançamentos)

Se ultrapassar, considerar Firebase ou Supabase.

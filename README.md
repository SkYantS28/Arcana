# Arcana

Arcana é um aplicativo de gestão para profissionais que realizam atendimentos personalizados, como espaços esotéricos e consultórios. O sistema organiza a rotina de trabalho em um único ambiente: agenda, consulentes, catálogo de serviços, financeiro, programa de recompensas, equipe e configurações da conta.

A aplicação está disponível como **site responsivo** e como **aplicativo Android**, utilizando a mesma base de código web.

## Funcionalidades

- **Autenticação**
  - Cadastro e confirmação de conta por e-mail.
  - Login e encerramento de sessão.
  - Recuperação e redefinição de senha.
  - Identificação da sessão atual pelo Supabase Auth.

- **Visão geral**
  - Resumo de atendimentos ativos, quantidade de consulentes e receita recebida.
  - Acesso rápido às principais áreas de configuração.

- **Agenda**
  - Calendário mensal com pesquisa e filtros.
  - Cadastro de atendimentos agendados ou por prazo.
  - Associação com consulente e serviço.
  - Registro de valor, pagamento e observações.
  - Edição, conclusão, cancelamento, reativação e exclusão de atendimentos.

- **Consulentes**
  - Cadastro, pesquisa e edição de consulentes.
  - Registro de telefone e descrição.
  - Marcação de favoritos.
  - Histórico de consultas concluídas, pendentes e canceladas.

- **Catálogo de serviços**
  - Cadastro de serviços com nome, descrição e preço em reais.
  - Busca e exclusão de serviços.
  - Configuração de pontos de fidelidade por serviço.

- **Recompensas**
  - Configuração de um programa de fidelidade.
  - Regras por quantidade de atendimentos ou pontos acumulados.
  - Pontuação automática ou manual por consulente.
  - Histórico de transações e recompensas concedidas.

- **Financeiro**
  - Registro de receitas e despesas.
  - Filtros por período, tipo, situação e descrição.
  - Resumos de entradas, saídas e saldo.
  - Exportação dos dados em Excel (`.xlsx`) e PDF.

- **Equipe e acessos**
  - Cadastro de membros da equipe.
  - Convites e status de vínculo.
  - Permissões separadas por módulo e ação.

- **Notificações**
  - Alertas de atendimentos e movimentações de pontos.
  - Atualização periódica e marcação de itens como lidos.
  - Avisos armazenados localmente no navegador.

- **Perfil e preferências**
  - Nome completo e e-mail.
  - Tema claro ou escuro.
  - Idiomas português, inglês e espanhol.
  - Informações do período de teste e registro de consentimento de cobrança.

## Tecnologias

### Aplicação web

- **React 19** com componentes funcionais e Hooks.
- **JavaScript/JSX**.
- **Vite 8** para desenvolvimento e geração da versão de produção.
- **CSS** modularizado por páginas e componentes.
- **React DOM**.
- **Lucide React** para ícones.
- **jsPDF** e **jsPDF-AutoTable** para exportação de relatórios em PDF.
- **SheetJS/XLSX** para exportação de planilhas.

### Backend e serviços

- **Supabase** para autenticação, banco de dados PostgreSQL e comunicação pelo cliente JavaScript.
- Armazenamento das informações por usuário, com identificadores associados ao `owner_id`.
- Dados organizados em tabelas como `profiles`, `services`, `clients`, `appointments`, `finance_entries`, `loyalty_*` e `team_members`.

### Aplicativo Android

- **Capacitor 8**.
- Projeto nativo Android em Java e Gradle.
- A interface Android utiliza o build web gerado pelo Vite no diretório `dist`.

### Qualidade e implantação

- **ESLint 10** para análise estática.
- **GitHub Actions** para build web e Android.
- **Azure Static Web Apps** para hospedagem da aplicação web.
- Build Android gera APK de teste e AAB de distribuição.

## Estrutura do projeto

```text
Arcana/
├── .github/workflows/    # Builds Android e implantação no Azure
├── android/              # Projeto nativo Android gerado pelo Capacitor
├── public/               # Arquivos públicos estáticos
├── src/
│   ├── components/       # Componentes compartilhados
│   ├── data/             # Traduções da interface
│   ├── hooks/            # Hooks compartilhados
│   ├── lib/              # Cliente Supabase e eventos de notificações
│   ├── pages/            # Páginas principais do sistema
│   ├── styles/           # CSS específico de páginas e recursos
│   ├── App.jsx           # Sessão, navegação e integração geral
│   ├── Auth.jsx          # Login, cadastro e recuperação
│   ├── main.jsx          # Inicialização React
│   └── supabase-test.js  # Verificação manual da conexão
├── capacitor.config.json # Identificação e integração Android
├── package.json          # Dependências e scripts
└── vite.config.js        # Configuração do Vite
```

## Pré-requisitos

- Node.js 24 ou superior.
- npm.
- Uma conta e um projeto no Supabase.
- Para gerar o aplicativo Android:
  - JDK 21.
  - Android SDK.

## Configuração do Supabase

Crie um arquivo `.env.local` na raiz do projeto:

```dotenv
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-publica
```

Nunca utilize uma chave privada de serviço no frontend.

O projeto espera as seguintes tabelas no Supabase:

| Tabela | Uso principal |
| --- | --- |
| `profiles` | Perfil, tema, idioma e período de teste |
| `services` | Catálogo de serviços e pontos de fidelidade |
| `clients` | Consulentes cadastrados |
| `appointments` | Agenda, prazos, pagamentos e status |
| `finance_entries` | Movimentações financeiras |
| `loyalty_settings` | Configuração do programa de recompensas |
| `loyalty_rules` | Regras de pontos e recompensas |
| `loyalty_transactions` | Histórico de movimentação de pontos |
| `loyalty_rewards` | Registro das recompensas concedidas |
| `team_members` | Membros e permissões da equipe |

Os registros são filtrados pelo usuário autenticado. As políticas de segurança do Supabase (`RLS`) devem permitir operações apenas aos usuários autorizados.

## Executando localmente

```bash
npm install
npm run dev
```

O endereço exibido pelo Vite normalmente é `http://localhost:5173`.

## Scripts disponíveis

```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção em dist/
npm run preview  # Prévia local da versão compilada
npm run lint     # Verificação com ESLint
```

## Gerando a versão web

```bash
npm run build
npm run preview
```

Os arquivos publicados são gerados em `dist/`.

## Gerando o aplicativo Android

Compile a interface web, sincronize o Capacitor e gere o pacote Android:

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

O APK de teste será gerado em:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Para gerar o pacote Android App Bundle:

```bash
cd android
./gradlew bundleRelease
```

O resultado será criado em `android/app/build/outputs/bundle/release/`.

## Implantação

### Web

O workflow do Azure Static Web Apps executa a instalação das dependências, gera o build com as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` e publica o conteúdo do diretório `dist`.

### Android

O workflow `Build Arcana Android` compila o projeto web, sincroniza o Capacitor e gera:

- Um APK de debug.
- Um Android App Bundle de release.

Os artefatos ficam disponíveis na execução do GitHub Actions por sete dias.

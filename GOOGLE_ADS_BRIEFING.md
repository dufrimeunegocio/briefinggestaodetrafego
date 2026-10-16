# Briefing de Gestão de Tráfego Pago — Google Ads

## Arquitetura
- Aplicação React + TypeScript + Vite.
- Fluxo de uma pergunta por vez, com navegação, progresso e tela de revisão.
- Supabase: os envios são gravados em public.google_ads_briefings, sem misturar ou sobrescrever os registros de public.briefings.
- A logo é reutilizada a partir do repositório público de referência e as cores/tipografia seguem a identidade Dufri (#123C6B, #37C6D0, #7DBA84, Manrope e Sora).

## Configuração
1. Aplique supabase/migrations/20261016000000_create_google_ads_briefings.sql no mesmo projeto Supabase utilizado pelo briefing atual.
2. Configure no Lovable/Vercel:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_PUBLISHABLE_KEY
3. Use apenas a chave publicável/anon no navegador. Nunca adicione a chave service_role a variáveis VITE_*.
4. Instale dependências e execute npm run build.

A política de leitura usa a função public.is_briefing_admin() já existente no banco de referência. Se a função não existir no ambiente escolhido, adapte a política para o mecanismo de autorização administrativa desse banco antes de aplicar a migração.

## Validação e privacidade
- Campos obrigatórios e formatos são verificados na interface; a função/trigger PostgreSQL também valida campos essenciais, e-mail, telefone, escolhas, tamanho e estrutura das respostas.
- O token de envio único evita duplicação acidental ao repetir uma tentativa.
- O banco define submitted_at, created_at e status.
- Não são solicitadas credenciais, dados de pagamento ou informações de pacientes.
- O rascunho é mantido apenas em sessionStorage da aba para ajudar a recuperar respostas após uma atualização; ele é removido após o envio bem-sucedido.

## Testes necessários antes de publicar
- Preencher os campos obrigatórios e testar os opcionais.
- Testar as condições de atendimento presencial, objetivo “Outro” e histórico de Google Ads.
- Testar e-mail e WhatsApp inválidos.
- Aplicar a migração, configurar variáveis e confirmar que um envio aparece na tabela google_ads_briefings.
- Confirmar que um usuário anônimo não consegue consultar os registros e que usuários sem permissão administrativa não conseguem ler os dados.
- Revalidar o briefing de sites no repositório original, que não deve ser alterado por este projeto.

## Limitação atual
A criação do código e da migração não aplica a migração automaticamente no banco nem configura as variáveis de ambiente do projeto hospedado. A gravação real só pode ser confirmada depois dessas configurações.

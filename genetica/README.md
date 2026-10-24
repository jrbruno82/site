# Genética Elite

Dashboard web com login no servidor, catálogo de touros, perfis de acesso, comparação genética e integração privada com Google Sheets.

## Arquitetura e requisitos

- Node.js 20 ou superior.
- Uma planilha Google privada, compartilhada com a conta de serviço do servidor.
- Uma chave JSON de conta de serviço guardada fora deste projeto.
- O GitHub Pages hospeda somente a interface estática; o login e a integração com Sheets exigem a API Node.js implantada separadamente.

## Configuração do Google Sheets

1. Ative a Google Sheets API no projeto Google Cloud e crie uma conta de serviço.
2. Guarde o arquivo JSON da conta de serviço em um local seguro. Não o coloque neste repositório.
3. Compartilhe a planilha com o e-mail da conta de serviço como **Editor**. Não publique a planilha na web.
4. Crie uma aba chamada `Usuarios` (ou ajuste `GOOGLE_SHEET_TAB`) com esta linha de cabeçalho, exatamente nesta ordem:

   ```text
   email | name | password_hash | role | active | created_at
   ```

5. As senhas devem ser armazenadas somente como hashes scrypt. Não coloque senhas em texto aberto na planilha. O servidor cria esse hash ao cadastrar uma conta.
6. Se a planilha já tiver usuários, faça backup e migre os cabeçalhos e senhas para o formato acima antes de iniciar o serviço. Senhas antigas em texto aberto não são aceitas.

Se a aba estiver vazia, o servidor cria o cabeçalho. Para uma instalação sem conta master/admin ativa, configure a conta inicial no ambiente; o servidor grava a conta inicial com a senha convertida para hash. A senha inicial deve ter ao menos 12 caracteres.

## Publicar a interface no GitHub Pages e a API no Render

1. No Render, crie um **Blueprint** a partir deste repositório. O arquivo `render.yaml` configura o serviço web e declara as variáveis necessárias.
2. Nos Environment Variables do serviço Render, preencha:
   - `GOOGLE_SERVICE_ACCOUNT_JSON`: o conteúdo JSON da chave da conta de serviço. Mantenha a variável como segredo.
   - `FRONTEND_ORIGINS`: a origem exata do site publicado, por exemplo `https://usuario.github.io` (sem caminho, barra final ou wildcard). Para um domínio próprio, use sua origem HTTPS.
   - `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD`: necessários apenas se a planilha ainda não tiver uma conta master/admin ativa. Use uma senha forte com pelo menos 12 caracteres.
3. Compartilhe a planilha privada com o e-mail da conta de serviço como **Editor**. Nunca coloque a chave JSON, senhas ou dados da planilha no repositório ou em `config.js`.
4. Depois que o Render publicar a API, copie a URL HTTPS do serviço e configure `window.GENETICA_API_URL` em `config.js`, sem caminho, por exemplo:

   ```js
   window.GENETICA_API_URL = "https://genetica-elite-api.onrender.com";
   ```

5. Publique o repositório no GitHub Pages e acesse o site por HTTPS. O endpoint `/api/health` deve responder `{"status":"ok"}` na URL do Render.

O navegador precisa permitir cookies entre sites para que a sessão HttpOnly funcione entre `github.io` e `onrender.com`. Alguns navegadores ou configurações bloqueiam cookies de terceiros; para evitar essa limitação em produção, use um domínio próprio com interface e API sob o mesmo domínio registrável ou hospede a interface e a API na mesma origem.

## Iniciar localmente

1. Copie `.env.example` para `.env` e configure `GOOGLE_APPLICATION_CREDENTIALS`, `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_NAME` e uma `INITIAL_ADMIN_PASSWORD` forte. Alternativamente, `GOOGLE_SERVICE_ACCOUNT_JSON` pode conter o JSON da conta de serviço. O ID da planilha informado para este projeto já está no exemplo.
2. Instale as dependências e inicie:

   ```powershell
   npm install
   npm start
   ```

3. Acesse `http://localhost:3000`. Não abra `index.html` diretamente: o login e os dados dependem do servidor.

O arquivo `.env` e a chave de serviço são ignorados pelo Git. Em produção, use HTTPS, variáveis/segredos do provedor de hospedagem e uma única instância do servidor. As sessões ficam na memória e são encerradas quando o processo reinicia; escalar para várias instâncias requer um armazenamento compartilhado de sessões.

As descrições localizadas dos touros são mantidas em `data/bull-translations.js` e entregues pelo endpoint autenticado do catálogo no idioma selecionado. Não inclua esses textos no código JavaScript público do navegador. `config.js` contém apenas a URL pública da API; nunca coloque credenciais nele.

### Formato exigido para as contas da planilha

A aba `Usuarios` deve ter os cabeçalhos `email`, `name`, `password_hash`, `role`, `active`, `created_at`, exatamente nessa ordem. `password_hash` precisa conter um hash scrypt criado pelo sistema; senhas em texto puro na planilha não são aceitas. O perfil deve ser `master`, `admin` ou `visualizador`, e `active` deve ser `true`. Se a planilha atual usa outros cabeçalhos ou guarda senhas em texto puro, faça backup e migre o esquema e as senhas antes de tentar entrar. Não envie senhas ou a chave da conta de serviço por chat.

## Perfis

- **master** e **admin**: podem criar usuários, ativar/inativar contas e atribuir os perfis master, admin ou visualizador.
- **visualizador**: pode acessar o catálogo e os gráficos comparativos, sem gerenciar usuários.

O servidor impede que um usuário altere o próprio perfil ou desative a própria conta e mantém pelo menos uma conta master/admin ativa. O endpoint de usuários nunca devolve hashes de senha.

## Gráficos comparativos

Marque os touros no catálogo para comparar índice genético, produção de leite, proteína, gordura ou confiabilidade. As avaliações exibidas no catálogo desta demonstração são dados ilustrativos; substitua `data/bulls.js` pelos dados aprovados antes de disponibilizar o sistema.

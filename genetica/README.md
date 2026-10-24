# Genética Elite

Dashboard web com login no servidor, catálogo de touros, perfis de acesso, comparação genética e integração privada com Google Sheets.

## Requisitos

- Node.js 20 ou superior.
- Uma planilha Google privada, compartilhada com a conta de serviço do servidor.
- Uma chave JSON de conta de serviço guardada fora deste projeto.

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

## Iniciar localmente

1. Copie `.env.example` para `.env` e configure `GOOGLE_APPLICATION_CREDENTIALS`, `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_NAME` e uma `INITIAL_ADMIN_PASSWORD` forte. O ID da planilha informado para este projeto já está no exemplo.
2. Instale as dependências e inicie:

   ```powershell
   npm install
   npm start
   ```

3. Acesse `http://localhost:3000`. Não abra `index.html` diretamente: o login e os dados dependem do servidor.

O arquivo `.env` e a chave de serviço são ignorados pelo Git. Em produção, use HTTPS, variáveis/segredos do provedor de hospedagem e uma única instância do servidor. As sessões ficam na memória e são encerradas quando o processo reinicia; escalar para várias instâncias requer um armazenamento compartilhado de sessões.

As descrições localizadas dos touros são mantidas em `data/bull-translations.js` e entregues pelo endpoint autenticado do catálogo no idioma selecionado. Não inclua esses textos no código JavaScript público do navegador.

## Perfis

- **master** e **admin**: podem criar usuários, ativar/inativar contas e atribuir os perfis master, admin ou visualizador.
- **visualizador**: pode acessar o catálogo e os gráficos comparativos, sem gerenciar usuários.

O servidor impede que um usuário altere o próprio perfil ou desative a própria conta e mantém pelo menos uma conta master/admin ativa. O endpoint de usuários nunca devolve hashes de senha.

## Gráficos comparativos

Marque os touros no catálogo para comparar índice genético, produção de leite, proteína, gordura ou confiabilidade. As avaliações exibidas no catálogo desta demonstração são dados ilustrativos; substitua `data/bulls.js` pelos dados aprovados antes de disponibilizar o sistema.

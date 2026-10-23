# Conectar o registro de uso à planilha Google

O registro é opcional: a página pede autorização, oferece continuar sem registrar e não solicita nem armazena localização. A sessão é um identificador aleatório temporário da aba; não é nome, e-mail ou conta do usuário.

## Configurar a planilha e o endpoint

1. Abra a planilha compartilhada e selecione **Extensões > Apps Script**. Isso cria um script vinculado à planilha e usa a conta Google que tem acesso a ela.
2. Substitua o conteúdo de `Code.gs` pelo arquivo [`google-apps-script/Code.gs`](./google-apps-script/Code.gs). O ID da planilha já está configurado para a planilha informada.
3. Selecione a função `setup` e execute-a. Autorize o acesso ao Google Sheets. A função configura o fuso `America/Sao_Paulo` e cria/usa a aba `eventos` com os cabeçalhos necessários. Se uma aba `eventos` com dados já existir e seus cabeçalhos não coincidirem, a execução para sem sobrescrever os dados.
4. Em **Implantar > Nova implantação**, selecione **App da Web**, execute como sua conta e limite o acesso conforme a política de privacidade do seu projeto. Para uma página pública sem login Google, o endpoint precisa aceitar solicitações anônimas; qualquer pessoa que obtenha a URL poderá tentar enviar eventos. O script valida campos, limita o volume por sessão e não expõe uma rota para ler a planilha.
5. Copie a URL `/exec` da implantação e cole-a em `analytics-config.js`:

   ```js
   window.JOGOS_ANALYTICS_ENDPOINT = "https://script.google.com/macros/s/SUA_IMPLANTACAO/exec";
   ```

6. Publique a página com HTTPS e abra-a novamente. O banner permite aceitar ou recusar. A opção **Privacidade** no rodapé permite mudar a preferência.

## Colunas registradas

`sessao_id`, `evento`, `jogo_id`, `jogo`, `dificuldade`, `variacao`, `dispositivo`, `navegador`, `sistema_operacional`, `resolucao_tela`, `idioma`, `data_hora_brasilia`, `data_hora_utc` e `duracao_segundos`.

Cada entrada autorizada gera `page_entry`; cada jogo aberto gera `game_selected` e, ao fechar ou sair da página, `game_finished` com a duração. A sessão da página termina com `page_exit`. A duração é aproximada se o navegador ou sistema operacional encerrar a aba sem emitir o evento de saída.

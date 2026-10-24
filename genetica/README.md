# Genética Elite

Dashboard estático para demonstração de seleção e comparação genética de touros. Pode ser publicado diretamente no GitHub Pages, sem servidor ou integração com Google Sheets.

## Acessos fictícios

Use qualquer uma destas contas na tela de login:

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Master | `master@genetica.demo` | `Genetica@2026` |
| Admin | `admin@genetica.demo` | `Genetica@2026` |
| Visualizador | `visitante@genetica.demo` | `Genetica@2026` |

Master e admin podem simular a criação de usuários e a alteração de perfis e status. Essas mudanças ficam somente no `localStorage` do navegador atual.

## Publicar no GitHub Pages

1. Publique os arquivos do projeto no GitHub.
2. Em **Settings → Pages**, selecione o branch e a pasta que contém `index.html`.
3. Acesse a URL publicada. O controle simulado funciona sem configurar API ou credenciais.

## Importante: não é um controle de acesso real

Este projeto está deliberadamente em modo de demonstração. O login é implementado no JavaScript do navegador, as contas fictícias estão visíveis no site e os dados do catálogo são arquivos públicos. Qualquer pessoa pode contornar a tela de login ou inspecionar os dados. Não use senhas reais, dados pessoais, informações privadas ou este modo para proteger um site.

O antigo servidor Node.js e a configuração do Render não são usados pelo GitHub Pages nem por esta simulação. Para autenticação real e planilha privada, será necessário reativar e hospedar um backend seguro fora do GitHub Pages.

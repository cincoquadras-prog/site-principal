# CincoQuadras: site estático para publicar (pacote para o desenvolvedor)

Site estático em HTML, CSS e JavaScript (sem framework, sem build no servidor), com um único script PHP (`enviar.php`) que recebe o formulário "Pedir a análise" e envia por e-mail. Destino previsto: hospedagem Hostinger (LiteSpeed, PHP, hPanel), domínio `cincoquadras.com.br`.

## O que tem no pacote

- `public_html/`: tudo que vai na raiz do site (conteúdo do `public_html` do domínio).
- `cq-config.php`: configuração do envio do formulário (SMTP). Tem o campo `SENHA_DO_EMAIL` para preencher. Não colocar em repositório.

## Publicação

1. Enviar o conteúdo de `public_html/` para a raiz do site (o `.htaccess` é arquivo oculto, conferir que subiu).
2. Colocar o `cq-config.php` uma pasta acima de `public_html` (fora da raiz web). O `enviar.php` procura primeiro em `../cq-config.php` e depois em `./cq-config.php`; se não puder sair da raiz, pode ficar junto do `enviar.php` (o `.htaccess` bloqueia `cq-config*`).
3. Preencher `smtp_pass` com a senha da caixa `contato@cincoquadras.com.br` (criar a caixa no hPanel, em E-mails).
4. Ativar SSL no domínio (certificado gratuito) e confirmar HTTPS.
5. Testar (lista abaixo).

## Formulário (`enviar.php`)

- Recebe POST (`application/x-www-form-urlencoded` ou multipart) de `analise.html`. O JavaScript envia com `fetch` e `Accept: application/json` e recebe `{"ok":true}` ou `{"ok":false,"erro":"..."}`. Sem JavaScript, o formulário faz POST normal e recebe uma página HTML simples de confirmação ou erro.
- Envio por SMTP autenticado: `smtp.hostinger.com`, porta 465 com SSL (alternativa: 587 com `'smtp_secure' => 'tls'`), usuário e remetente `contato@cincoquadras.com.br`, destinatário `contato@cincoquadras.com.br`. Cliente SMTP próprio, sem dependências. Se `smtp_pass` estiver vazio, cai para `mail()`.
- Assunto do e-mail: `Nome da pessoa - Nome do condomínio` (UTF-8, codificado em base64). `Reply-To` é o e-mail da pessoa quando ela informa e-mail. O corpo traz nome, "você é", canal preferido, WhatsApp e/ou e-mail, link `wa.me` quando há WhatsApp, condomínio, tipo de edifício, unidades, frentes marcadas, data e hora e página de origem.
- Validação no servidor (repete a do navegador), campo-isca `empresa_site` (se preenchido, responde ok sem enviar), checagem de `Origin`, limite de 5 envios por hora por IP (arquivo em `sys_get_temp_dir()`), remoção de caracteres de controle (sem injeção de cabeçalho).
- Se o envio falha, grava o pedido em `cq-falhas.log` (na pasta acima de `public_html` quando gravável; senão junto do script) e responde erro 500. O arquivo contém dados pessoais: apagar periodicamente. `.htaccess` bloqueia `*.log` dentro da raiz.
- Requisitos: PHP 7.4 ou superior com `mbstring` e `openssl` (testado em PHP 8.3). Para o SMTP, a hospedagem precisa liberar saída para a porta 465 ou 587.

## Servidor (`.htaccess`)

HTTPS forçado, `www` redirecionado para o domínio sem `www`, `ErrorDocument 404 /404.html` (a 404 usa caminhos absolutos a partir da raiz), `Options -Indexes`, cabeçalhos de segurança (HSTS deixado comentado para ligar depois de confirmar o HTTPS), compressão e cache. O redirecionamento do `www` está com `cincoquadras.com.br` escrito no arquivo.

## SEO e compartilhamento

`robots.txt`, `sitemap.xml` (5 páginas), `canonical`, Open Graph e `twitter:card` com imagem 1200x630 (`assets/img/og-cincoquadras.png`), ícone `apple-touch-icon.png`, JSON-LD (`Organization`) na home. `privacidade.html` e `404.html` têm `noindex`. O domínio está gravado nos HTML no momento da geração.

## Arquivos

- Páginas: `index.html`, `o-que-fazemos.html`, `como-funciona.html`, `sobre.html`, `analise.html`, `privacidade.html`, `404.html`.
- `assets/css/site.css`, `assets/js/site.js` (cerca de 20 KB, sem bibliotecas), `assets/fonts/` (Plus Jakarta Sans, hospedada no próprio site, sem Google Fonts), `assets/brand/` (logos e favicon), `assets/img/`, `assets/video/` (vídeo do manifesto, 8,7 MB, só carrega ao clicar em assistir), `assets/docs/politica-de-privacidade-cincoquadras.pdf`.
- Nenhuma requisição a domínios externos (testado).

## Testes para fazer depois de subir

1. `https://cincoquadras.com.br` abre; `http://` e `www` redirecionam para `https://cincoquadras.com.br`.
2. As 5 páginas abrem, o vídeo toca na página Sobre, o PDF baixa na página Política de privacidade.
3. Um endereço inexistente (por exemplo `/teste`) mostra a página 404 com estilo e retorna status 404.
4. Preencher o formulário em `/analise.html` com dados de teste: aparece "Pedido enviado." e chega e-mail em `contato@cincoquadras.com.br` (ver spam) com o assunto `Nome - Condomínio`.
5. Repetir o formulário com a internet do celular. Conferir a prévia do link no WhatsApp (logo e "Tudo funciona melhor por aqui.").

## O que foi e o que não foi testado

Testado: 236 checagens automáticas no navegador (sem erro de console, sem rolagem horizontal de 320 a 1920 px, links, formulário em passos, envio simulado com sucesso e com falha, 404 em endereço profundo) e o `enviar.php` em PHP 8.3 contra um servidor SMTP falso (assunto com acentos, validação, injeção de cabeçalho, isca, origem externa, limite por IP, registro de falha).
Não testado: envio real pela Hostinger (depende da senha da caixa), regras do `.htaccess` no servidor, leitor de tela e aparelhos reais.

## Contatos e dados que estão no site

E-mail `contato@cincoquadras.com.br`, WhatsApp (11) 92715-3000 (`https://wa.me/5511927153000`), CNPJ 67.799.815/0001-53 no rodapé. Sem endereço físico.

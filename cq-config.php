<?php
/*
 * Configuração do envio do formulário "Pedir a análise" (CincoQuadras).
 * Guarde este arquivo UMA PASTA ACIMA de public_html (fora do site).
 * Troque SENHA_DO_EMAIL pela senha da caixa contato@cincoquadras.com.br criada no hPanel e salve.
 * Não envie este arquivo por e-mail nem para o GitHub: ele tem a senha.
 */
return [
    'smtp_host'   => 'smtp.hostinger.com',
    'smtp_port'   => 465,
    'smtp_secure' => 'ssl',                          // 'ssl' (porta 465) ou 'tls' (porta 587)
    'smtp_user'   => 'contato@cincoquadras.com.br',
    'smtp_pass'   => 'SENHA_DO_EMAIL',
    'to'          => 'contato@cincoquadras.com.br',  // quem recebe os pedidos
    'from'        => 'contato@cincoquadras.com.br',  // remetente: e-mail do próprio domínio
    'from_name'   => 'Site CincoQuadras',
];

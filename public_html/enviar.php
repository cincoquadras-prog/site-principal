<?php
/*
 * CincoQuadras: recebe o formulário "Pedir a análise do meu condomínio" e envia por e-mail.
 * Assunto do e-mail: "Nome da pessoa - Nome do condomínio".
 *
 * Configuração (senha do e-mail) em cq-config.php, de preferência UMA PASTA ACIMA de public_html.
 * Modelo: cq-config.exemplo.php. Sem o arquivo, o envio usa a função mail() do servidor.
 */
declare(strict_types=1);
mb_internal_encoding('UTF-8');
date_default_timezone_set('America/Sao_Paulo');

$wantsJson = isset($_SERVER['HTTP_ACCEPT']) && stripos((string)$_SERVER['HTTP_ACCEPT'], 'application/json') !== false;

function reply(bool $ok, int $status, string $msg = '') {
    global $wantsJson;
    http_response_code($status);
    header('Cache-Control: no-store');
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'erro' => $msg], JSON_UNESCAPED_UNICODE);
        exit;
    }
    header('Content-Type: text/html; charset=utf-8');
    $t = $ok ? 'Pedido enviado.' : 'Não foi possível enviar.';
    $p = $ok ? 'Recebemos os seus dados e entraremos em contato para marcar a conversa.' : htmlspecialchars($msg ?: 'Tente de novo em instantes.', ENT_QUOTES, 'UTF-8');
    echo '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>' . $t . ' | CincoQuadras</title>'
       . '<style>body{font-family:system-ui,sans-serif;background:#F6F3EC;color:#0F3D32;margin:0;padding:64px 24px;line-height:1.5}main{max-width:36rem;margin:0 auto}h1{font-size:32px;margin:0 0 16px}a{color:#1F7348;font-weight:700}</style></head><body><main><h1>' . $t . '</h1><p>' . $p . '</p><p><a href="'
       . ($ok ? 'index.html' : 'analise.html') . '">' . ($ok ? 'Voltar ao início' : 'Voltar ao formulário') . '</a></p></main></body></html>';
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { header('Allow: POST'); reply(false, 405, 'Método não permitido.'); }

/* só aceita envio vindo do próprio site */
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    $oh = parse_url($origin, PHP_URL_HOST);
    $hh = preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? ''));
    if ($oh && $hh && strcasecmp($oh, $hh) !== 0) reply(false, 403, 'Origem não permitida.');
}

/* configuração */
$cfg = ['smtp_host' => 'smtp.hostinger.com', 'smtp_port' => 465, 'smtp_secure' => 'ssl', 'smtp_user' => '', 'smtp_pass' => '',
        'to' => 'contato@cincoquadras.com.br', 'from' => 'contato@cincoquadras.com.br', 'from_name' => 'Site CincoQuadras', 'verify_peer' => true];
foreach ([__DIR__ . '/../cq-config.php', __DIR__ . '/cq-config.php'] as $f) {
    if (is_file($f)) { $c = include $f; if (is_array($c)) $cfg = array_merge($cfg, $c); break; }
}
if ($cfg['smtp_pass'] === 'SENHA_DO_EMAIL') $cfg['smtp_pass'] = '';   /* modelo não editado */
$logDir = is_writable(__DIR__ . '/..') ? realpath(__DIR__ . '/..') : (is_writable(__DIR__) ? __DIR__ : sys_get_temp_dir());

/* campo-isca: bots preenchem, pessoas não veem. Responde "ok" sem enviar */
if (trim((string)($_POST['empresa_site'] ?? '')) !== '') reply(true, 200);

/* limite simples: 5 pedidos por hora por endereço */
$ip = $_SERVER['REMOTE_ADDR'] ?? '0';
$rl = sys_get_temp_dir() . '/cq_rl_' . md5($ip);
$hits = [];
if (is_file($rl)) { $hits = array_filter(array_map('intval', (array)explode(',', (string)@file_get_contents($rl))), fn($t) => $t > time() - 3600); }
if (count($hits) >= 5) reply(false, 429, 'Muitos pedidos em pouco tempo. Tente novamente mais tarde.');

function clean(string $k, int $max = 200): string {
    $v = (string)($_POST[$k] ?? '');
    $v = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $v);
    return mb_substr(trim((string)$v), 0, $max);
}
$tipoEd = clean('tipo_edificio', 20);
$condo  = clean('condo', 120);
$unid   = preg_replace('/[\s.]/', '', clean('unidades', 10));
$nome   = clean('nome', 120);
$tipo   = clean('tipo', 40);
$via    = clean('via', 20);
$whats  = clean('whatsapp', 30);
$email  = clean('email', 120);
$pesa   = clean('pesa', 400);
$consent = !empty($_POST['consent']);

$erros = [];
if (!in_array($tipoEd, ['Residencial', 'Comercial', 'Misto'], true)) $erros[] = 'tipo de edifício';
if (mb_strlen($condo) < 3) $erros[] = 'nome do condomínio';
if (!preg_match('/^\d{1,5}$/', $unid) || (int)$unid < 1) $erros[] = 'número de unidades';
if (mb_strlen($nome) < 2) $erros[] = 'nome';
if (!in_array($tipo, ['Síndico morador', 'Síndico profissional', 'Conselheiro', 'Morador', 'Outro'], true)) $erros[] = '"Você é"';
$digits = preg_replace('/\D/', '', $whats);
$whatsOk = $whats !== '' && preg_match('/^[\d\s()+\-.]+$/', $whats) && strlen($digits) >= 10 && strlen($digits) <= 13;
$emailOk = $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
if ($via === 'WhatsApp') { if (!$whatsOk) $erros[] = 'WhatsApp'; }
elseif ($via === 'E-mail') { if (!$emailOk) $erros[] = 'e-mail'; }
else { if (!$whatsOk && !$emailOk) $erros[] = 'WhatsApp ou e-mail'; }   /* sem JavaScript, os dois campos aparecem */
if (!$consent) $erros[] = 'aceite do contato';
if ($erros) reply(false, 422, 'Revise: ' . implode(', ', $erros) . '.');

/* assunto: nome da pessoa + nome do condomínio */
$assunto = mb_substr($nome . ' - ' . $condo, 0, 150);
$wa = '';
if ($whatsOk) { $n = (strlen($digits) <= 11) ? '55' . $digits : $digits; $wa = 'https://wa.me/' . $n; }
$canal = $via !== '' ? $via : ($whatsOk ? 'WhatsApp' : 'E-mail');
$pagina = (isset($_SERVER['HTTP_REFERER']) && preg_match('#^https?://#', (string)$_SERVER['HTTP_REFERER'])) ? mb_substr((string)$_SERVER['HTTP_REFERER'], 0, 200) : '';

$linhas = [
    'Novo pedido de análise pelo site', '',
    'Nome: ' . $nome,
    'Você é: ' . $tipo,
    'Prefere ser chamado por: ' . $canal,
    'WhatsApp: ' . ($whatsOk ? $whats : '(não informado)'),
    'E-mail: ' . ($emailOk ? $email : '(não informado)'),
];
if ($wa !== '' && $canal === 'WhatsApp') $linhas[] = 'Abrir conversa: ' . $wa;
$linhas = array_merge($linhas, [
    '',
    'Condomínio: ' . $condo,
    'Tipo de edifício: ' . $tipoEd,
    'Número de unidades: ' . $unid,
    'Frentes marcadas pelo visitante: ' . ($pesa !== '' ? $pesa : '(nenhuma)'),
    '',
    'Aceitou o contato conforme a Política de privacidade: sim',
    'Recebido em: ' . date('d/m/Y H:i') . ' (horário de Brasília)',
]);
if ($pagina !== '') $linhas[] = 'Página: ' . $pagina;
$corpo = implode("\r\n", $linhas) . "\r\n";

function enc(string $s): string { return '=?UTF-8?B?' . base64_encode($s) . '?='; }
function addr(string $nome, string $mail): string { return enc($nome) . ' <' . $mail . '>'; }

$cab = [
    'Date: ' . date('r'),
    'From: ' . addr($cfg['from_name'], $cfg['from']),
    'To: ' . $cfg['to'],
    'Subject: ' . enc($assunto),
    'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . (explode('@', $cfg['from'])[1] ?? 'localhost') . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    'X-Mailer: CincoQuadras-site',
];
if ($emailOk) $cab[] = 'Reply-To: ' . addr($nome, $email);
$msg = implode("\r\n", $cab) . "\r\n\r\n" . chunk_split(base64_encode($corpo), 76, "\r\n");

function smtp_send(array $c, string $msg): bool {
    $secure = $c['smtp_secure'];
    $ctx = stream_context_create(['ssl' => ['verify_peer' => (bool)$c['verify_peer'], 'verify_peer_name' => (bool)$c['verify_peer']]]);
    $host = ($secure === 'ssl' ? 'ssl://' : '') . $c['smtp_host'] . ':' . $c['smtp_port'];
    $fp = @stream_socket_client($host, $en, $es, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) { error_log("cq-smtp: conexão falhou ($en $es)"); return false; }
    stream_set_timeout($fp, 15);
    $read = function () use ($fp): array {
        $code = 0; $all = '';
        while (($l = fgets($fp, 1024)) !== false) { $all .= $l; $code = (int)substr($l, 0, 3); if (strlen($l) < 4 || $l[3] !== '-') break; }
        return [$code, $all];
    };
    $cmd = function (string $s, array $ok) use ($fp, $read): bool {
        fwrite($fp, $s . "\r\n"); [$code, $all] = $read();
        if (!in_array($code, $ok, true)) { error_log('cq-smtp: ' . preg_replace('/AUTH.*/i', 'AUTH …', $s) . ' => ' . trim($all)); return false; }
        return true;
    };
    [$code] = $read(); if ($code !== 220) { fclose($fp); return false; }
    $ehlo = 'cincoquadras.com.br';
    $good = $cmd('EHLO ' . $ehlo, [250]);
    if ($good && $secure === 'tls') {
        $good = $cmd('STARTTLS', [220]) && @stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT) && $cmd('EHLO ' . $ehlo, [250]);
    }
    if ($good && $c['smtp_user'] !== '') {
        $good = $cmd('AUTH LOGIN', [334]) && $cmd(base64_encode($c['smtp_user']), [334]) && $cmd(base64_encode($c['smtp_pass']), [235]);
    }
    $good = $good && $cmd('MAIL FROM:<' . $c['from'] . '>', [250]) && $cmd('RCPT TO:<' . $c['to'] . '>', [250, 251]) && $cmd('DATA', [354]);
    if ($good) {
        fwrite($fp, preg_replace('/^\./m', '..', $msg) . "\r\n.\r\n"); [$code, $all] = $read();
        $good = $code === 250; if (!$good) error_log('cq-smtp: DATA => ' . trim($all));
    }
    @fwrite($fp, "QUIT\r\n"); fclose($fp);
    return $good;
}

$enviado = false;
if ($cfg['smtp_pass'] !== '' || ($cfg['smtp_user'] === '' && $cfg['smtp_secure'] === 'none')) {
    $enviado = smtp_send($cfg, $msg);
} else {
    /* sem senha configurada: função mail() do servidor */
    $partes = explode("\r\n\r\n", $msg, 2);
    $hdr = preg_replace('/^(To|Subject): .*\r\n?/mi', '', $partes[0]);
    $enviado = @mail($cfg['to'], enc($assunto), $partes[1], trim($hdr));
}

if (!$enviado) {
    /* guarda o pedido para não perder o contato */
    @file_put_contents($logDir . '/cq-falhas.log', '[' . date('c') . '] ' . $assunto . "\n" . $corpo . "\n---\n", FILE_APPEND | LOCK_EX);
    reply(false, 500, 'Não foi possível enviar agora.');
}

$hits[] = time();
@file_put_contents($rl, implode(',', $hits), LOCK_EX);
reply(true, 200);

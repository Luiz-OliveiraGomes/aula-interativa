<?php
// Roteamento do ambiente local.
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');
header('Cache-Control: no-store');
if (preg_match('~(?:^|/)\.~', $path)) {
    http_response_code(404);
    exit('Não encontrado');
}
// O servidor embutido pode servir index.html sem acrescentar a barra final.
// Sem ela, o navegador procura os JS/CSS relativos na pasta pai.
if (substr($path, -1) !== '/' && is_dir($_SERVER['DOCUMENT_ROOT'] . $path)) {
    $requestPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $query = parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY);
    header('Location: ' . $requestPath . '/' . ($query !== null ? '?' . $query : ''), true, 308);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'HEAD' && $path !== '/api/visits.php') {
    http_response_code(503);
    header('Content-Type: text/html; charset=utf-8');
    exit('<h1>Ambiente local</h1><p>O envio de contato depende do banco de dados original e está desativado nesta cópia.</p><a href="/">Voltar ao site</a>');
}
return false;

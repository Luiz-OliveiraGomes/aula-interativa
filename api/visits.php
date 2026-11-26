<?php
declare(strict_types=1);
require_once __DIR__ . '/analytics-store.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, ['GET','POST'], true)) { http_response_code(405); exit('{"error":"Método não permitido"}'); }
    $directory = getenv('AULA_ANALYTICS_DATA_DIR') ?: dirname(__DIR__, 2) . '/work/site-data';
    $store = new AulaVisitStore($directory);
    $now = time();
    if ($method === 'POST') {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $expected = (empty($_SERVER['HTTPS']) || $_SERVER['HTTPS'] === 'off' ? 'http://' : 'https://') . ($_SERVER['HTTP_HOST'] ?? '');
        if (($origin !== '' && $origin !== $expected) || !str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
            http_response_code(403); exit('{"error":"Origem não permitida"}');
        }
        $body = file_get_contents('php://input', false, null, 0, 2048);
        $input = json_decode($body, true, 8);
        if (!is_array($input) || !in_array($input['type'] ?? '', ['page','ping','leave'], true)) { http_response_code(400); exit('{"error":"Evento inválido"}'); }
        $eventId = $input['id'] ?? '';
        if (!is_string($eventId) || !preg_match('/^[a-zA-Z0-9_-]{16,80}$/', $eventId)) { http_response_code(400); exit('{"error":"Evento inválido"}'); }
        session_name('AULA_VISITOR');
        session_start(['use_strict_mode'=>1, 'cookie_httponly'=>true, 'cookie_samesite'=>'Lax', 'cookie_secure'=>str_starts_with($expected,'https://')]);
        if ($input['type'] === 'ping' || $input['type'] === 'leave') {
            if (!empty($_SESSION['aula_visit_id'])) {
                if ($input['type'] === 'leave') $store->leave($_SESSION['aula_visit_id'], $eventId);
                else $store->ping($_SESSION['aula_visit_id'], $now, $eventId);
            }
        } else {
            $newVisit = empty($_SESSION['aula_visit_id']) || $now - ($_SESSION['aula_last_seen'] ?? 0) > 1800;
            $visitId = $newVisit ? bin2hex(random_bytes(24)) : $_SESSION['aula_visit_id'];
            $location = $newVisit || empty($_SESSION['aula_location']) ? aulaVisitorLocation($_SERVER['REMOTE_ADDR'] ?? '') : $_SESSION['aula_location'];
            if ($store->record($eventId, $visitId, $newVisit, $location, $now)) {
                $_SESSION['aula_visit_id'] = $visitId;
                $_SESSION['aula_last_seen'] = $now;
                $_SESSION['aula_location'] = $location;
            }
        }
        if ($input['type'] !== 'leave' && !empty($_SESSION['aula_visit_id'])) $_SESSION['aula_last_seen'] = $now;
        session_write_close();
    }
    echo json_encode($store->snapshot($now), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    http_response_code(503);
    echo '{"error":"O contador está temporariamente indisponível."}';
}

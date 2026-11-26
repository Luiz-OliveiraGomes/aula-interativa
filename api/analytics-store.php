<?php
declare(strict_types=1);

final class AulaVisitStore
{
    private PDO $db;

    public function __construct(string $directory)
    {
        if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
            throw new RuntimeException('Não foi possível preparar o contador.');
        }
        $this->db = new PDO('sqlite:' . $directory . '/visitors.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $this->db->exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL');
        $this->db->exec('CREATE TABLE IF NOT EXISTS totals (id INTEGER PRIMARY KEY, visits INTEGER NOT NULL, pageviews INTEGER NOT NULL);
            INSERT OR IGNORE INTO totals VALUES (1,0,0);
            CREATE TABLE IF NOT EXISTS daily (day TEXT PRIMARY KEY, visits INTEGER NOT NULL, pageviews INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS locations (location_key TEXT PRIMARY KEY, country_code TEXT NOT NULL, country TEXT NOT NULL, region TEXT NOT NULL, city TEXT NOT NULL, visits INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS active (visit_id TEXT PRIMARY KEY, last_seen INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS active_tabs (visit_id TEXT NOT NULL, tab_id TEXT NOT NULL, last_seen INTEGER NOT NULL, PRIMARY KEY(visit_id,tab_id));
            CREATE TABLE IF NOT EXISTS presence_locations (visit_id TEXT PRIMARY KEY, location_key TEXT NOT NULL, last_seen INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS events (event_id TEXT PRIMARY KEY, created_at INTEGER NOT NULL)');
        $columns = $this->db->query('PRAGMA table_info(locations)')->fetchAll(PDO::FETCH_COLUMN, 1);
        foreach (['latitude','longitude'] as $column) {
            if (!in_array($column, $columns, true)) $this->db->exec('ALTER TABLE locations ADD COLUMN ' . $column . ' REAL');
        }
    }

    public function record(string $eventId, string $visitId, bool $newVisit, array $location, int $now): bool
    {
        $this->db->beginTransaction();
        try {
            $insert = $this->db->prepare('INSERT OR IGNORE INTO events VALUES (?,?)');
            $insert->execute([$eventId, $now]);
            if ($insert->rowCount() === 0) { $this->db->commit(); return false; }
            $visits = $newVisit ? 1 : 0;
            $this->db->prepare('UPDATE totals SET visits=visits+?,pageviews=pageviews+1 WHERE id=1')->execute([$visits]);
            $this->db->prepare('INSERT INTO daily VALUES (?,?,1) ON CONFLICT(day) DO UPDATE SET visits=visits+excluded.visits,pageviews=pageviews+1')->execute([self::day($now), $visits]);
            if (isset($location['country_code'])) {
                $key = hash('sha256', implode('|', [$location['country_code'], $location['region'], $location['city']]));
                $this->db->prepare('INSERT INTO locations (location_key,country_code,country,region,city,visits,latitude,longitude) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(location_key) DO UPDATE SET visits=visits+excluded.visits,latitude=COALESCE(locations.latitude,excluded.latitude),longitude=COALESCE(locations.longitude,excluded.longitude)')
                    ->execute([$key, $location['country_code'], $location['country'], $location['region'], $location['city'], $visits, $location['latitude'] ?? null, $location['longitude'] ?? null]);
                $this->db->prepare('INSERT INTO presence_locations VALUES (?,?,?) ON CONFLICT(visit_id) DO UPDATE SET location_key=excluded.location_key,last_seen=excluded.last_seen')->execute([$visitId,$key,$now]);
            }
            $this->ping($visitId, $now, $eventId);
            $this->db->prepare('DELETE FROM events WHERE created_at < ?')->execute([$now - 86400]);
            $this->db->prepare('DELETE FROM active WHERE last_seen < ?')->execute([$now - 3600]);
            $this->db->prepare('DELETE FROM active_tabs WHERE last_seen < ?')->execute([$now - 120]);
            $this->db->prepare('DELETE FROM presence_locations WHERE last_seen < ?')->execute([$now - 86400]);
            $this->db->commit();
            return true;
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $error;
        }
    }

    public function ping(string $visitId, int $now, string $tabId): void
    {
        $this->db->prepare('INSERT INTO active_tabs VALUES (?,?,?) ON CONFLICT(visit_id,tab_id) DO UPDATE SET last_seen=excluded.last_seen')->execute([$visitId, $tabId, $now]);
        $this->db->prepare('UPDATE presence_locations SET last_seen=? WHERE visit_id=?')->execute([$now,$visitId]);
    }

    public function leave(string $visitId, string $tabId): void
    {
        $this->db->prepare('DELETE FROM active_tabs WHERE visit_id=? AND tab_id=?')->execute([$visitId, $tabId]);
    }

    public function snapshot(int $now): array
    {
        $totals = $this->db->query('SELECT visits,pageviews FROM totals WHERE id=1')->fetch(PDO::FETCH_ASSOC);
        $today = $this->db->prepare('SELECT visits FROM daily WHERE day=?');
        $today->execute([self::day($now)]);
        $online = $this->db->prepare('SELECT COUNT(DISTINCT visit_id) FROM active_tabs WHERE last_seen >= ?');
        $online->execute([$now - 45]);
        $activeQuery = $this->db->prepare('SELECT p.location_key,COUNT(DISTINCT a.visit_id) AS online FROM active_tabs a JOIN presence_locations p ON a.visit_id=p.visit_id WHERE a.last_seen>=? GROUP BY p.location_key');
        $activeQuery->execute([$now-45]);
        $activeByLocation = $activeQuery->fetchAll(PDO::FETCH_KEY_PAIR);
        $cities = $this->db->query('SELECT location_key,country_code,country,region,city,visits,latitude,longitude FROM locations WHERE visits>0 ORDER BY visits DESC')->fetchAll(PDO::FETCH_ASSOC);
        $countries = [];
        foreach ($cities as &$city) {
            $city['online'] = (int)($activeByLocation[$city['location_key']] ?? 0);
            unset($city['location_key']);
            $code = $city['country_code'];
            if (!isset($countries[$code])) $countries[$code] = ['country_code'=>$code,'country'=>$city['country'],'visits'=>0,'online'=>0];
            $countries[$code]['visits'] += (int)$city['visits'];
            $countries[$code]['online'] += $city['online'];
        }
        unset($city);
        $countries = array_values($countries);
        usort($countries, fn($a,$b) => $b['visits'] <=> $a['visits']);
        return [
            'visits' => (int)$totals['visits'], 'pageviews' => (int)$totals['pageviews'],
            'today' => (int)($today->fetchColumn() ?: 0), 'online' => (int)$online->fetchColumn(),
            'countries_count' => (int)$this->db->query("SELECT COUNT(DISTINCT country_code) FROM locations WHERE visits>0 AND country_code NOT IN ('LOCAL','XX')")->fetchColumn(),
            'countries' => $countries,
            'cities' => array_slice($cities,0,500),
            'map_locations' => array_values(array_filter($cities, fn($city) => $city['latitude'] !== null && $city['longitude'] !== null)),
            'updated_at' => gmdate('c', $now)
        ];
    }

    private static function day(int $now): string
    {
        return (new DateTimeImmutable('@' . $now))->setTimezone(new DateTimeZone('America/Fortaleza'))->format('Y-m-d');
    }
}

function aulaVisitorLocation(string $ip): array
{
    $unknown = ['country_code'=>'XX', 'country'=>'Origem não identificada', 'region'=>'', 'city'=>'Localização indisponível'];
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
        return ['country_code'=>'LOCAL', 'country'=>'Acesso local', 'region'=>'', 'city'=>'Nesta máquina ou rede local'];
    }
    if (!in_array('https', stream_get_wrappers(), true)) return $unknown;
    $context = stream_context_create(['http'=>['timeout'=>2, 'ignore_errors'=>true], 'ssl'=>['verify_peer'=>true, 'verify_peer_name'=>true]]);
    $body = @file_get_contents('https://ipwho.is/' . rawurlencode($ip) . '?fields=success,country_code,country,region,city,latitude,longitude&lang=pt-BR', false, $context, 0, 8192);
    $data = $body ? json_decode($body, true, 16) : null;
    if (!is_array($data) || ($data['success'] ?? false) !== true || !preg_match('/^[A-Z]{2}$/', $data['country_code'] ?? '')) return $unknown;
    foreach (['country', 'region', 'city'] as $field) $data[$field] = trim(substr(strip_tags((string)($data[$field] ?? '')), 0, 160));
    return ['country_code'=>$data['country_code'], 'country'=>$data['country'], 'region'=>$data['region'], 'city'=>$data['city'] ?: 'Cidade não identificada', 'latitude'=>isset($data['latitude'])?round((float)$data['latitude'],1):null, 'longitude'=>isset($data['longitude'])?round((float)$data['longitude'],1):null];
}

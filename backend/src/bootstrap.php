<?php

require_once __DIR__ . '/Core/Database.php';
require_once __DIR__ . '/Core/Router.php';
require_once __DIR__ . '/Core/Controller.php';

// ─── Load .env ────────────────────────────────────────────────────────────────
$envCandidates = [
    __DIR__ . '/../.env',
    __DIR__ . '/../../.env',
    __DIR__ . '/../public/.env',
];

foreach ($envCandidates as $envFile) {
    if (file_exists($envFile)) {
        foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            if (str_starts_with(trim($line), '#')) continue;
            if (!str_contains($line, '=')) continue;
            [$key, $val] = explode('=', $line, 2);
            $key = trim($key);
            $val = trim($val);
            // Strip inline comments if they exist
            if (($pos = strpos($val, '#')) !== false) {
                // simple hack: if # exists, and we don't have quotes, strip it
                if (!str_starts_with($val, '"') && !str_starts_with($val, "'")) {
                    $val = trim(substr($val, 0, $pos));
                }
            }

            // Strip quotes from value
            if (str_starts_with($val, '"') && str_ends_with($val, '"')) {
                $val = substr($val, 1, -1);
            } elseif (str_starts_with($val, "'") && str_ends_with($val, "'")) {
                $val = substr($val, 1, -1);
            }

            if (!array_key_exists($key, $_ENV) && getenv($key) === false) {
                $_ENV[$key] = $val;
                putenv($key . '=' . $val);
            }
        }
    }
}

// ─── Autoloader ───────────────────────────────────────────────────────────────
spl_autoload_register(function ($class) {
    $prefix   = 'BamzySMS\\';
    $base_dir = __DIR__ . '/';
    $len      = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) return;
    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';
    if (file_exists($file)) require $file;
});

if (!function_exists('env_or_default')) {
    function env_or_default(string $key, $default = null) {
        $fromEnv = $_ENV[$key] ?? getenv($key);
        return ($fromEnv !== false && $fromEnv !== null && $fromEnv !== '') ? $fromEnv : $default;
    }
}

function determine_cors_origin(): string {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = env_or_default('CORS_ALLOWED_ORIGINS', '*');
    
    if ($allowed === '*') {
        return '*';
    }

    $list = array_map('trim', explode(',', (string)$allowed));
    if ($origin && in_array($origin, $list, true)) {
        return $origin;
    }
    
    // If we're local, return origin for ease of use
    if ($origin && (str_contains($origin, 'localhost') || str_contains($origin, '127.0.0.1'))) {
        return $origin;
    }

    // Default to the first allowed origin, or '*' if fallback is intended
    return $list[0] ?? '*';
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
$origin = determine_cors_origin();
header("Access-Control-Allow-Origin: " . $origin);
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma");
header("Access-Control-Expose-Headers: Content-Type, Authorization");
header("Vary: Origin");

// Handle Credentials for Axios/EventSource withCredentials
if ($origin !== '*') {
    header("Access-Control-Allow-Credentials: true");
}

if (($_SERVER['REQUEST_METHOD'] ?? null) === 'OPTIONS') {
    // Some browsers require explicit 200/204 for preflight
    http_response_code(204);
    exit;
}

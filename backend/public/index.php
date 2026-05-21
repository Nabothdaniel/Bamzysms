<?php

require_once __DIR__ . '/../src/Core/Database.php';
require_once __DIR__ . '/../src/Core/Router.php';
require_once __DIR__ . '/../src/Core/Controller.php';

// ─── Load .env ────────────────────────────────────────────────────────────────
$envFile = __DIR__ . '/../../.env';
if (!file_exists($envFile)) {
    $envFile = __DIR__ . '/../.env';
}
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#')) continue;
        if (!str_contains($line, '=')) continue;
        [$key, $val] = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($val);
        putenv(trim($key) . '=' . trim($val));
    }
}

// ─── Autoloader ───────────────────────────────────────────────────────────────
spl_autoload_register(function ($class) {
    $prefix   = 'BamzySMS\\';
    $base_dir = __DIR__ . '/../src/';
    $len      = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) return;
    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';
    if (file_exists($file)) require $file;
});

use BamzySMS\Core\Router;

// ─── CORS ─────────────────────────────────────────────────────────────────────
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// ─── Routes ───────────────────────────────────────────────────────────────────
$router = new Router();

// Auth
$router->add('POST', '/api/auth/login',          'AuthController',        'login');
$router->add('POST', '/api/auth/register',        'AuthController',        'register');
$router->add('POST', '/api/auth/send-otp',        'AuthController',        'sendOtp');
$router->add('POST', '/api/auth/verify-otp',      'AuthController',        'verifyOtp');
$router->add('POST', '/api/auth/reset-password',  'AuthController',        'resetPassword');

// User
$router->add('GET',  '/api/user/profile',         'UserController',        'getProfile');
$router->add('GET',  '/api/user/balance',         'UserController',        'getBalance');
$router->add('GET',  '/api/transactions',         'TransactionController', 'getHistory');
$router->add('POST', '/api/purchase',             'TransactionController', 'purchase');

// Services & Countries (live from SMSBower)
$router->add('GET',  '/api/services',             'ServiceController',     'getServices');
$router->add('GET',  '/api/countries',            'ServiceController',     'getCountries');
$router->add('GET',  '/api/prices',               'ServiceController',     'getPrices');
$router->add('GET',  '/api/available',            'ServiceController',     'getAvailable');

// SMS / Activations
$router->add('POST', '/api/sms/buy',              'SMSController',         'buy');
$router->add('GET',  '/api/sms/purchases',        'SMSController',         'getPurchases');
$router->add('GET',  '/api/sms/status',           'SMSController',         'getStatus');
$router->add('POST', '/api/sms/set-status',       'SMSController',         'setActivationStatus');

// Admin
$router->add('GET',  '/api/admin/provider-balance', 'AdminController', 'getProviderBalance');
$router->add('GET',  '/api/admin/users',            'AdminController', 'getAllUsers');
$router->add('POST', '/api/admin/user/balance',     'AdminController', 'updateUserBalance');
$router->add('GET',  '/api/admin/settings',         'AdminController', 'getSettings');
$router->add('POST', '/api/admin/settings',        'AdminController', 'updateSettings');
$router->add('GET',  '/api/admin/usa-numbers',      'AdminController', 'getUsaNumbers');
$router->add('POST', '/api/admin/usa-numbers',      'AdminController', 'uploadUsaNumbers');

// Utils
$router->add('GET',  '/api/utils/server-ip',      'UtilsController',       'getServerIp');

$router->resolve();

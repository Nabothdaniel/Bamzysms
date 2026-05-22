<?php

namespace BamzySMS\Core;

use PDO;
use PDOException;

class Database {
    private static $instance = null;
    private $pdo;

    private function buildDsn(array $config): string {
        $port = isset($config['port']) && (int) $config['port'] > 0
            ? ';port=' . (int) $config['port']
            : '';

        return "mysql:host={$config['host']}{$port};dbname={$config['dbname']};charset={$config['charset']}";
    }

    private function __construct() {
        $config = require __DIR__ . '/../../config/database.php';
        $dsn = $this->buildDsn($config);
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
            PDO::ATTR_TIMEOUT => max(1, (int) ($config['connect_timeout'] ?? 5)),
        ];

        try {
            $this->pdo = new PDO($dsn, $config['user'], $config['pass'], array_merge($options, [
                PDO::ATTR_PERSISTENT => (bool) ($config['persistent'] ?? false),
            ]));
        } catch (PDOException $e) {
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
            exit;
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->pdo;
    }
}

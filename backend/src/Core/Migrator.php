<?php

namespace BamzySMS\Core;

use PDO;
use Exception;

class Migrator {
    private $db;
    private $migrationsPath;

    public function __construct(PDO $db) {
        $this->db = $db;
        $this->migrationsPath = __DIR__ . '/../../migrations';
        if (!is_dir($this->migrationsPath)) {
            mkdir($this->migrationsPath, 0755, true);
        }
    }

    public function migrate(): array {
        $this->ensureMigrationsTable();
        $applied = $this->getAppliedMigrations();
        $files = $this->getMigrationFiles();
        
        $results = [];

        foreach ($files as $file) {
            if (!in_array($file, $applied)) {
                try {
                    $this->applyMigration($file);
                    $results[] = ["file" => $file, "status" => "success"];
                } catch (Exception $e) {
                    $results[] = ["file" => $file, "status" => "error", "message" => $e->getMessage()];
                    break; // Stop on first error
                }
            }
        }

        return $results;
    }

    private function ensureMigrationsTable() {
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ");
    }

    private function getAppliedMigrations(): array {
        $stmt = $this->db->query("SELECT name FROM migrations");
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    private function getMigrationFiles(): array {
        $files = glob($this->migrationsPath . '/*.sql');
        sort($files);
        return array_map('basename', $files);
    }

    private function applyMigration(string $file) {
        $path = $this->migrationsPath . '/' . $file;
        $sql = file_get_contents($path);
        
        if (trim($sql) === '') return;

        // Simple splitting by semicolon. 
        // Note: This matches most migrations but isn't perfect for complex triggers/procedures.
        $statements = array_filter(array_map('trim', explode(';', $sql)));

        foreach ($statements as $statement) {
            if ($statement !== '') {
                $this->executeStatement($statement);
            }
        }

        // Record it
        $stmt = $this->db->prepare("INSERT IGNORE INTO migrations (name) VALUES (?)");
        $stmt->execute([$file]);
    }

    private function executeStatement(string $statement): void {
        $stmt = $this->db->prepare($statement);
        $stmt->execute();

        do {
            try {
                $stmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (\Throwable $e) {
                // Statements like SET / ALTER / PREPARE have no result rows.
            }
        } while ($stmt->nextRowset());

        $stmt->closeCursor();
    }
}

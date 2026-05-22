<?php

namespace BamzySMS\Models;

use BamzySMS\Core\Database;
use PDO;

class User {
    private $db;
    private $encryptionKey;
    private static $userSchemaChecked = false;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
        $this->encryptionKey = $_ENV['PLATFORM_ENCRYPTION_KEY'] ?? 'BAMZY-FALLBACK-SECRET-2026';
        $this->ensureUserSchemaUpToDate();
    }

    private function ensureUserSchemaUpToDate(): void {
        if (self::$userSchemaChecked) {
            return;
        }

        $requiredColumns = [
            'recovery_key' => "ALTER TABLE users ADD COLUMN recovery_key VARCHAR(255) NULL AFTER transaction_pin",
            'recovery_key_saved' => "ALTER TABLE users ADD COLUMN recovery_key_saved BOOLEAN DEFAULT FALSE",
            'whatsapp_notifications' => "ALTER TABLE users ADD COLUMN whatsapp_notifications BOOLEAN DEFAULT FALSE",
            'whatsapp_number' => "ALTER TABLE users ADD COLUMN whatsapp_number VARCHAR(20) NULL",
        ];

        foreach ($requiredColumns as $column => $alterSql) {
            $stmt = $this->db->prepare("SHOW COLUMNS FROM users LIKE ?");
            $stmt->execute([$column]);

            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->db->exec($alterSql);
            }
        }

        self::$userSchemaChecked = true;
    }

    private function encrypt($data) {
        $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length('aes-256-cbc'));
        $encrypted = openssl_encrypt($data, 'aes-256-cbc', $this->encryptionKey, 0, $iv);
        return base64_encode($iv . $encrypted);
    }

    private function decrypt($data) {
        $data = base64_decode($data);
        $ivSize = openssl_cipher_iv_length('aes-256-cbc');
        $iv = substr($data, 0, $ivSize);
        $encrypted = substr($data, $ivSize);
        return openssl_decrypt($encrypted, 'aes-256-cbc', $this->encryptionKey, 0, $iv);
    }

    public function create($data) {
        $sql = "INSERT INTO users (username, name, phone, whatsapp_number, password, referral_code, recovery_key) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        $username = strtolower($data['username'] ?? preg_replace('/[^a-zA-Z0-9]/', '', $data['name'] ?? 'user' . rand(100, 999)));
        
        // Generate a plain recovery key to show the user, but store the hash
        $plainKey = 'BAMZY-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 4)) . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 4));
        $hashedKey = password_hash($plainKey, PASSWORD_DEFAULT);

        $stmt->execute([
            $username,
            $data['name'] ?? $username,
            $data['phone'] ?? null,
            $data['phone'] ?? null, // Default whatsapp_number to phone if provided
            password_hash($data['password'], PASSWORD_DEFAULT),
            'BAMZY' . strtoupper(substr(uniqid(), -6)),
            $hashedKey
        ]);
        
        return [
            'id' => $this->db->lastInsertId(),
            'recovery_key' => $plainKey
        ];
    }

    public function findByUsername($username) {
        $sql = "SELECT * FROM users WHERE username = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([strtolower(trim((string) $username))]);
        return $stmt->fetch();
    }

    public function findById($id) {
        $sql = "SELECT id, username, name, phone, balance, role, recovery_key_saved, (recovery_key IS NOT NULL) as has_recovery_key, whatsapp_notifications, whatsapp_number, created_at FROM users WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Update a user's balance directly (admin/manual adjustments).
     * Clamps to 0 — cannot set a negative balance.
     */
    public function updateBalance(int $userId, float $newBalance): bool {
        $newBalance = max(0.00, $newBalance); // hard floor: never go negative
        $stmt = $this->db->prepare("UPDATE users SET balance = ? WHERE id = ?");
        return $stmt->execute([$newBalance, $userId]);
    }

    /**
     * List all users for administrative purposes.
     */
    public function getAllUsers(): array {
        $stmt = $this->db->query("SELECT id, username, name, phone, balance, role, recovery_key_saved, (recovery_key IS NOT NULL) as has_recovery_key, whatsapp_notifications, whatsapp_number, created_at FROM users ORDER BY id DESC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getAdminIds(): array {
        $stmt = $this->db->query("SELECT id FROM users WHERE role = 'admin'");
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    /**
     * Get paginated users for admin.
     */
    public function getPaginatedUsers(int $page = 1, int $limit = 20, string $search = '', array $filters = []): array {
        $offset = ($page - 1) * $limit;
        $where = [];
        $params = [];

        if ($search !== '') {
            $where[] = "(name LIKE ? OR username LIKE ? OR phone LIKE ?)";
            $searchTerm = "%$search%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        if (isset($filters['role']) && $filters['role'] !== '') {
            $where[] = "role = ?";
            $params[] = $filters['role'];
        }

        $whereClause = !empty($where) ? " WHERE " . implode(" AND ", $where) : "";

        // 1. Get total count
        $sqlCount = "SELECT COUNT(*) FROM users" . $whereClause;
        $stmtCount = $this->db->prepare($sqlCount);
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();

        // 2. Get data
        $sqlData = "SELECT id, username, name, phone, balance, role, recovery_key_saved, (recovery_key IS NOT NULL) as has_recovery_key, whatsapp_notifications, whatsapp_number, created_at FROM users" . $whereClause . " ORDER BY id DESC LIMIT $limit OFFSET $offset";
        $stmtData = $this->db->prepare($sqlData);
        $stmtData->execute($params);
        $users = $stmtData->fetchAll(PDO::FETCH_ASSOC);

        return [
            'data' => $users,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total / $limit)
        ];
    }


    public function updatePassword($username, $password) {
        $stmt = $this->db->prepare("UPDATE users SET password = ? WHERE username = ?");
        return $stmt->execute([
            password_hash($password, PASSWORD_DEFAULT),
            strtolower(trim((string) $username))
        ]);
    }

    public function updatePasswordHashById(int $userId, string $passwordHash): bool {
        $stmt = $this->db->prepare("UPDATE users SET password = ? WHERE id = ?");
        return $stmt->execute([$passwordHash, $userId]);
    }

    public function deductBalance($userId, $amount) {
        $stmt = $this->db->prepare("UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?");
        return $stmt->execute([$amount, $userId, $amount]);
    }

    /**
     * Add to a user's balance (top-ups, refunds).
     * Guards against negative amounts being passed in.
     */
    public function addBalance($userId, $amount) {
        if ((float)$amount <= 0) return false; // never subtract via addBalance
        $stmt = $this->db->prepare("UPDATE users SET balance = balance + ? WHERE id = ?");
        return $stmt->execute([$amount, $userId]);
    }

    public function updateToken($id, $token) {
        $hashedToken = hash('sha256', $token);
        $sql = "UPDATE users SET token = ? WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$hashedToken, $id]);
    }

    public function updatePin($id, $pin) {
        $hashedPin = password_hash($pin, PASSWORD_DEFAULT);
        $sql = "UPDATE users SET transaction_pin = ? WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$hashedPin, $id]);
    }

    public function verifyPin($id, $pin) {
        $sql = "SELECT transaction_pin FROM users WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if (!$user || !$user['transaction_pin']) return false;
        return password_verify($pin, $user['transaction_pin']);
    }

    public function hasPin($id) {
        $sql = "SELECT transaction_pin FROM users WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        return !empty($user['transaction_pin']);
    }

    public function verifyToken($token) {
        $hashedToken = hash('sha256', $token);
        $sql = "SELECT id FROM users WHERE token = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$hashedToken]);
        $user = $stmt->fetch();
        return $user ? $user['id'] : null;
    }

    public function markKeyAsSaved($userId) {
        $stmt = $this->db->prepare("UPDATE users SET recovery_key_saved = 1 WHERE id = ?");
        return $stmt->execute([$userId]);
    }

    public function updateWhatsappSettings($userId, $enabled, $number = null) {
        $number = is_string($number) ? trim($number) : null;
        if ($number === '') {
            $number = null;
        }
        // NOTE: we preserve the whatsapp_number even when notifications are disabled
        // so the user doesn't have to re-type it when they re-enable.
        if ($number !== null) {
            // Number was explicitly provided — update both columns
            $sql = "UPDATE users SET whatsapp_notifications = ?, whatsapp_number = ? WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([(int)$enabled, $number, $userId]);
        } else {
            // No number provided — only update the toggle
            $sql = "UPDATE users SET whatsapp_notifications = ? WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([(int)$enabled, $userId]);
        }
    }

    /**
     * Generate a new recovery key for a user.
     * Stores it ENCRYPTED so it can be revealed later with a PIN.
     */
    public function regenerateRecoveryKey($userId) {
        $plainKey = 'BAMZY-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 4)) . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 4));
        $encryptedKey = $this->encrypt($plainKey);

        $stmt = $this->db->prepare("UPDATE users SET recovery_key = ?, recovery_key_saved = 0 WHERE id = ?");
        if ($stmt->execute([$encryptedKey, $userId])) {
            return $plainKey;
        }
        return false;
    }

    /**
     * Get the decrypted recovery key for a user.
     */
    public function getRecoveryKey($userId) {
        $stmt = $this->db->prepare("SELECT recovery_key FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        if (!$row || !$row['recovery_key']) return null;

        // Try to decrypt. If it fails (e.g. it was a legacy hash), return null.
        $decrypted = $this->decrypt($row['recovery_key']);
        return $decrypted ?: null;
    }
}

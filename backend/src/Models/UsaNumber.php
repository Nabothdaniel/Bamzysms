<?php

namespace BamzySMS\Models;

use BamzySMS\Core\Database;
use PDO;
use RuntimeException;

class UsaNumber {
    private $db;
    private static $schemaEnsured = false;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
        $this->ensureSchema();
    }

    /* ------------------------------------------------------------------ */
    /*  Admin helpers                                                      */
    /* ------------------------------------------------------------------ */

    public function create(array $data): int {
        $stmt = $this->db->prepare("
            INSERT INTO usa_numbers
                (phone_number, service_name, category, redirect_url, sell_price, cost_price, notes, uploaded_by, status)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, 'available')
        ");

        $stmt->execute([
            $this->normalizePhone($data['phone_number'] ?? ''),
            $this->normalizeText((string)($data['service_name'] ?? 'USA Number'), 'USA Number'),
            $this->normalizeText((string)($data['category'] ?? 'WhatsApp'), 'WhatsApp'),
            trim((string)($data['redirect_url'] ?? '')),
            (float)($data['sell_price'] ?? 0),
            max(0, (float)($data['cost_price'] ?? 0)),
            trim((string)($data['notes'] ?? '')) ?: null,
            (int)$data['uploaded_by'],
        ]);

        return (int)$this->db->lastInsertId();
    }

    public function bulkCreate(array $rows, int $adminId): array {
        $batch = 'USA-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
        $created = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            $phone = $this->normalizePhone((string)($row['phone_number'] ?? ''));
            $redirectUrl = trim((string)($row['redirect_url'] ?? ''));
            $sellPrice = (float)($row['sell_price'] ?? 0);

            if ($phone === '' || $redirectUrl === '' || $sellPrice <= 0) {
                $errors[] = ['row' => $index + 1, 'message' => 'Phone, redirect URL, and sell price are required.'];
                continue;
            }

            try {
                $this->create([
                    'phone_number' => $phone,
                    'service_name' => $row['service_name'] ?? 'USA Number',
                    'category' => $row['category'] ?? 'WhatsApp',
                    'redirect_url' => $redirectUrl,
                    'sell_price' => $sellPrice,
                    'cost_price' => (float)($row['cost_price'] ?? 0),
                    'notes' => $row['notes'] ?? '',
                    'uploaded_by' => $adminId,
                ]);
                $created++;
            } catch (\PDOException $e) {
                $errors[] = [
                    'row' => $index + 1,
                    'message' => $e->getCode() === '23000' ? 'Duplicate phone number.' : 'Upload failed.',
                ];
            }
        }

        return compact('created', 'errors', 'batch');
    }

    public function getAdminPaginated(int $page, int $limit, string $search = '', string $status = ''): array {
        $offset = ($page - 1) * $limit;
        $where = [];
        $params = [];

        if ($search !== '') {
            $where[] = "(un.phone_number LIKE ? OR un.notes LIKE ? OR un.service_name LIKE ? OR un.category LIKE ?)";
            $term = "%{$search}%";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        if ($status !== '') {
            $where[] = "un.status = ?";
            $params[] = $status;
        }

        $whereClause = $where ? " WHERE " . implode(" AND ", $where) : "";

        $stmtCount = $this->db->prepare("SELECT COUNT(*) FROM usa_numbers un" . $whereClause);
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();

        $stmt = $this->db->prepare("
            SELECT un.*, u.username AS uploaded_by_username, buyer.username AS sold_to_username
            FROM usa_numbers un
            JOIN users u ON u.id = un.uploaded_by
            LEFT JOIN users buyer ON buyer.id = un.sold_to
            {$whereClause}
            ORDER BY un.created_at DESC
            LIMIT {$limit} OFFSET {$offset}
        ");
        $stmt->execute($params);

        return [
            'data' => array_map(function (array $row) {
                $row['has_redirect'] = !empty($row['redirect_url']);
                return $row;
            }, $stmt->fetchAll(PDO::FETCH_ASSOC)),
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => (int)ceil($total / max(1, $limit)),
        ];
    }

    public function updateNumber(int $numberId, array $data): bool {
        $stmt = $this->db->prepare("
            UPDATE usa_numbers
            SET
                phone_number = ?,
                service_name = ?,
                category = ?,
                redirect_url = ?,
                sell_price = ?,
                cost_price = ?,
                notes = ?
            WHERE id = ?
        ");

        return $stmt->execute([
            $this->normalizePhone($data['phone_number'] ?? ''),
            $this->normalizeText((string)($data['service_name'] ?? 'USA Number'), 'USA Number'),
            $this->normalizeText((string)($data['category'] ?? 'WhatsApp'), 'WhatsApp'),
            trim((string)($data['redirect_url'] ?? '')),
            (float)($data['sell_price'] ?? 0),
            max(0, (float)($data['cost_price'] ?? 0)),
            trim((string)($data['notes'] ?? '')) ?: null,
            $numberId,
        ]);
    }

    public function updateRedirectUrl(int $numberId, string $redirectUrl): bool {
        $stmt = $this->db->prepare("UPDATE usa_numbers SET redirect_url = ? WHERE id = ?");
        return $stmt->execute([trim($redirectUrl), $numberId]);
    }

    public function deleteNumber(int $numberId): bool {
        $stmt = $this->db->prepare("DELETE FROM usa_numbers WHERE id = ? AND status = 'available'");
        $stmt->execute([$numberId]);
        return $stmt->rowCount() > 0;
    }

    /* ------------------------------------------------------------------ */
    /*  User-facing helpers                                                */
    /* ------------------------------------------------------------------ */

    public function getAvailable(string $search = '', int $limit = 100): array {
        $params = [];
        $where = ["status = 'available'"];

        if ($search !== '') {
            $where[] = "(phone_number LIKE ?)";
            $params[] = "%{$search}%";
        }

        $whereClause = "WHERE " . implode(" AND ", $where);
        $stmt = $this->db->prepare("
            SELECT id, phone_number, service_name, category, sell_price, notes, created_at
            FROM usa_numbers
            {$whereClause}
            ORDER BY created_at DESC
            LIMIT " . (int)$limit
        );
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getOwnedByUser(int $userId): array {
        $stmt = $this->db->prepare("
            SELECT id, phone_number, service_name, category, sell_price, notes, otp_code, sold_at, created_at
            FROM usa_numbers
            WHERE sold_to = ?
            ORDER BY sold_at DESC, created_at DESC
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getById(int $numberId): ?array {
        $stmt = $this->db->prepare("SELECT * FROM usa_numbers WHERE id = ? LIMIT 1");
        $stmt->execute([$numberId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /* ------------------------------------------------------------------ */
    /*  Purchase + OTP fetch                                               */
    /* ------------------------------------------------------------------ */

    public function purchase(int $numberId, int $userId): array {
        $this->db->beginTransaction();

        try {
            // Lock row
            $stmtNumber = $this->db->prepare("SELECT * FROM usa_numbers WHERE id = ? FOR UPDATE");
            $stmtNumber->execute([$numberId]);
            $number = $stmtNumber->fetch(PDO::FETCH_ASSOC);

            if (!$number) {
                throw new RuntimeException('Selected USA number was not found.');
            }
            if ($number['status'] !== 'available') {
                throw new RuntimeException('This USA number has already been sold.');
            }

            // Lock user
            $stmtUser = $this->db->prepare("SELECT balance FROM users WHERE id = ? FOR UPDATE");
            $stmtUser->execute([$userId]);
            $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                throw new RuntimeException('User not found.');
            }

            $price = (float)$number['sell_price'];
            $balance = (float)$user['balance'];
            if ($balance < $price) {
                throw new RuntimeException('Insufficient balance for this USA number.');
            }

            // Debit
            $this->db->prepare("UPDATE users SET balance = balance - ? WHERE id = ?")->execute([$price, $userId]);

            // Transaction log
            $this->db->prepare("
                INSERT INTO transactions (user_id, amount, type, description)
                VALUES (?, ?, 'debit', ?)
            ")->execute([
                $userId,
                $price,
                "USA Number Purchase: {$number['phone_number']}"
            ]);

            // Mark sold
            $stmtSold = $this->db->prepare("
                UPDATE usa_numbers SET status = 'sold', sold_to = ?, sold_at = NOW() WHERE id = ? AND status = 'available'
            ");
            $stmtSold->execute([$userId, $numberId]);

            if ($stmtSold->rowCount() <= 0) {
                throw new RuntimeException('This USA number is no longer available.');
            }

            // Fetch OTP from redirect URL
            $otp = $this->fetchOtpFromUrl($number['redirect_url'] ?? '');

            // Store fetched OTP
            if ($otp !== '') {
                $this->db->prepare("UPDATE usa_numbers SET otp_code = ? WHERE id = ?")->execute([$otp, $numberId]);
            }

            $this->db->commit();

            return [
                'id' => (int)$number['id'],
                'phone_number' => $number['phone_number'],
                'sell_price' => $price,
                'otp_code' => $otp,
                'new_balance' => $balance - $price,
            ];
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Re-fetch OTP from the redirect URL (for owned numbers).
     */
    public function refreshOtp(int $numberId, int $userId): string {
        $number = $this->getById($numberId);

        if (!$number || (int)$number['sold_to'] !== $userId) {
            throw new RuntimeException('USA number not found or not owned by you.');
        }

        $otp = $this->fetchOtpFromUrl($number['redirect_url'] ?? '');

        if ($otp !== '') {
            $this->db->prepare("UPDATE usa_numbers SET otp_code = ? WHERE id = ?")->execute([$otp, $numberId]);
        }

        return $otp;
    }

    /* ------------------------------------------------------------------ */
    /*  Internal                                                           */
    /* ------------------------------------------------------------------ */

    private function fetchOtpFromUrl(string $url): string {
        if (empty($url)) return '';

        try {
            $ctx = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'method' => 'GET',
                    'header' => "User-Agent: BamzySMS/1.0\r\n",
                    'ignore_errors' => true,
                ],
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                ],
            ]);

            $response = @file_get_contents($url, false, $ctx);

            if ($response === false) return '';

            $body = trim($response);

            // If the body is pure JSON, try to extract common OTP fields
            $json = json_decode($body, true);
            if (is_array($json)) {
                return (string)(
                    $json['otp'] ??
                    $json['code'] ??
                    $json['pin'] ??
                    $json['otp_code'] ??
                    $json['data']['otp'] ??
                    $json['data']['code'] ??
                    $body
                );
            }

            // Otherwise return raw body (trimmed)
            return $body;
        } catch (\Throwable $e) {
            return '';
        }
    }

    private function normalizePhone(string $phone): string {
        return preg_replace('/[^\d+]/', '', trim($phone));
    }

    private function normalizeText(string $value, string $fallback): string {
        $clean = trim($value);
        return $clean !== '' ? $clean : $fallback;
    }

    private function ensureSchema(): void {
        if (self::$schemaEnsured) {
            return;
        }

        $this->db->exec("
            CREATE TABLE IF NOT EXISTS usa_numbers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                phone_number VARCHAR(30) NOT NULL,
                service_name VARCHAR(120) NOT NULL DEFAULT 'USA Number',
                category VARCHAR(120) NOT NULL DEFAULT 'WhatsApp',
                redirect_url TEXT NOT NULL,
                sell_price DECIMAL(10,2) NOT NULL,
                cost_price DECIMAL(10,2) DEFAULT 0.00,
                notes VARCHAR(255) NULL,
                otp_code TEXT NULL,
                uploaded_by INT NOT NULL,
                sold_to INT NULL,
                status ENUM('available', 'sold', 'cancelled') DEFAULT 'available',
                sold_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_usa_phone (phone_number),
                KEY idx_usa_status (status),
                KEY idx_usa_sold_to (sold_to),
                CONSTRAINT fk_usa_numbers_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id),
                CONSTRAINT fk_usa_numbers_sold_to FOREIGN KEY (sold_to) REFERENCES users(id)
            )
        ");

        $this->ensureColumn(
            'service_name',
            "ALTER TABLE usa_numbers ADD COLUMN service_name VARCHAR(120) NOT NULL DEFAULT 'USA Number' AFTER phone_number"
        );
        $this->ensureColumn(
            'category',
            "ALTER TABLE usa_numbers ADD COLUMN category VARCHAR(120) NOT NULL DEFAULT 'WhatsApp' AFTER service_name"
        );
        $this->ensureColumn(
            'redirect_url',
            "ALTER TABLE usa_numbers ADD COLUMN redirect_url TEXT NOT NULL AFTER category"
        );

        self::$schemaEnsured = true;
    }

    private function ensureColumn(string $column, string $alterSql): void {
        $stmt = $this->db->prepare("SHOW COLUMNS FROM usa_numbers LIKE ?");
        $stmt->execute([$column]);

        if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
            $this->db->exec($alterSql);
        }
    }
}

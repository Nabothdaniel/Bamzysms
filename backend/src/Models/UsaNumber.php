<?php

namespace BamzySMS\Models;

use BamzySMS\Core\Database;
use PDO;

class UsaNumber {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getAll(int $limit = 200): array {
        $limit = max(1, min($limit, 500));

        $stmt = $this->db->prepare("
            SELECT un.id, un.phone_number, un.receive_code_link, un.status, un.created_at, un.updated_at,
                   un.uploaded_by, u.name AS uploaded_by_name, u.email AS uploaded_by_email
            FROM usa_numbers un
            LEFT JOIN users u ON u.id = un.uploaded_by
            ORDER BY un.created_at DESC, un.id DESC
            LIMIT :limit
        ");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function create(string $phoneNumber, string $receiveCodeLink, int $uploadedBy, string $status = 'active'): int {
        $stmt = $this->db->prepare("
            INSERT INTO usa_numbers (phone_number, receive_code_link, status, uploaded_by)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$phoneNumber, $receiveCodeLink, $status, $uploadedBy]);

        return (int)$this->db->lastInsertId();
    }

    public function findByPhoneNumber(string $phoneNumber): ?array {
        $stmt = $this->db->prepare("SELECT * FROM usa_numbers WHERE phone_number = ? LIMIT 1");
        $stmt->execute([$phoneNumber]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }
}

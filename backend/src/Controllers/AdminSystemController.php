<?php

namespace BamzySMS\Controllers;

use BamzySMS\Middleware\AuthMiddleware;

class AdminSystemController extends AdminBaseController {

    /**
     * GET /api/admin/settings
     */
    public function getSettings() {
        $userId = AuthMiddleware::handle();
        $this->checkAdmin($userId);
        
        $settings = $this->settingModel->getAll();
        return $this->json(['status' => 'success', 'data' => $settings]);
    }

    /**
     * POST /api/admin/settings
     */
    public function updateSettings() {
        $userId = AuthMiddleware::handle();
        $this->checkAdmin($userId);
        
        $data = $this->getPostData();
        if (!is_array($data)) {
            return $this->json(['status' => 'error', 'message' => 'Invalid data.'], 400);
        }

        foreach ($data as $key => $value) {
            $this->settingModel->set((string)$key, (string)$value);
        }

        return $this->json(['status' => 'success', 'message' => 'Settings updated successfully.']);
    }

    /**
     * GET /api/admin/logs
     */
    public function getSystemLogs() {
        $userId = AuthMiddleware::handle();
        $this->checkAdmin($userId);

        $page  = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        $offset = ($page - 1) * $limit;

        // 1. Get total count
        $stmtCount = $this->db->query("SELECT COUNT(*) FROM system_logs");
        $total = (int)$stmtCount->fetchColumn();

        // 2. Get data
        $stmt = $this->db->prepare("
            SELECT l.*, u.name as user_name, u.username as user_username
            FROM system_logs l
            LEFT JOIN users u ON l.user_id = u.id
            ORDER BY l.id DESC LIMIT $limit OFFSET $offset
        ");
        $stmt->execute();
        $logs = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        
        return $this->json([
            'status' => 'success',
            'data' => $logs,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'pages' => ceil($total / $limit)
            ]
        ]);
    }


    /**
     * GET /api/admin/analytics
     */
    public function getAnalytics() {
        $userId = AuthMiddleware::handle();
        $this->checkAdmin($userId);

        // 1. Purchase and refund totals from the transactions ledger so
        //    dashboard metrics stay accurate after cancellations/reversals.
        $stmt = $this->db->query("
            SELECT 
                SUM(CASE 
                    WHEN type = 'debit' AND (description LIKE 'SMS Purchase:%' OR description LIKE 'Manual Number Purchase:%')
                    THEN amount ELSE 0 
                END) as gross_revenue,
                SUM(CASE 
                    WHEN type = 'credit' AND description LIKE 'Refund:%'
                    THEN amount ELSE 0 
                END) as refunded_revenue,
                SUM(CASE 
                    WHEN type = 'debit' AND (description LIKE 'SMS Purchase:%' OR description LIKE 'Manual Number Purchase:%')
                    THEN 1 ELSE 0 
                END) as total_orders,
                SUM(CASE 
                    WHEN type = 'credit' AND description LIKE 'Refund:%'
                    THEN 1 ELSE 0 
                END) as reversed_orders
            FROM transactions
        ");
        $totals = $stmt->fetch(\PDO::FETCH_ASSOC);

        $grossRevenue = (float)($totals['gross_revenue'] ?? 0);
        $refundedRevenue = (float)($totals['refunded_revenue'] ?? 0);
        $totalOrders = (int)($totals['total_orders'] ?? 0);
        $reversedOrders = (int)($totals['reversed_orders'] ?? 0);
        $successfulOrders = max(0, $totalOrders - $reversedOrders);

        // 2. Last 7 days net revenue (sales less refunds by day)
        $stmt = $this->db->query("
            SELECT 
                day_bucket.date,
                SUM(day_bucket.amount) as daily_revenue
            FROM (
                SELECT 
                    DATE(created_at) as date,
                    amount as amount
                FROM transactions
                WHERE type = 'debit'
                  AND (description LIKE 'SMS Purchase:%' OR description LIKE 'Manual Number Purchase:%')
                  AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)

                UNION ALL

                SELECT
                    DATE(created_at) as date,
                    -amount as amount
                FROM transactions
                WHERE type = 'credit'
                  AND description LIKE 'Refund:%'
                  AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ) as day_bucket
            GROUP BY day_bucket.date
            ORDER BY day_bucket.date ASC
        ");
        $daily = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // 3. User growth
        $stmt = $this->db->query("SELECT COUNT(*) FROM users WHERE role = 'user'");
        $userCount = $stmt->fetchColumn();

        return $this->json([
            'status' => 'success',
            'data' => [
                'totals' => [
                    'revenue' => $grossRevenue - $refundedRevenue,
                    'gross_revenue' => $grossRevenue,
                    'refunded_revenue' => $refundedRevenue,
                    'orders' => $successfulOrders,
                    'total_orders' => $totalOrders,
                    'reversed_orders' => $reversedOrders,
                    'success_rate' => $totalOrders > 0 ? round(($successfulOrders / $totalOrders) * 100, 1) : 100,
                    'users' => (int)$userCount
                ],
                'daily' => $daily
            ]
        ]);
    }

    /**
     * GET /api/admin/provider-balance
     */
    public function getProviderBalance() {
        $userId = AuthMiddleware::handle();
        $this->checkAdmin($userId);

        // Returning 0 as SMS Bower is removed
        return $this->json(['status' => 'success', 'balance' => 0]);
    }

    /**
     * GET /api/admin/provider/status
     */
    public function getProviderStatus() {
        $userId = AuthMiddleware::handle();
        $this->checkAdmin($userId);
        
        return $this->json([
            'status' => 'success',
            'provider' => 'offline',
            'note' => 'SMS Provider integration disabled.'
        ]);
    }

    /**
     * GET /api/admin/run-migrations
     * Bypass Auth: /api/admin/run-migrations?key=BAMZY-INITIAL-2026
     */
    public function runMigrations() {
        $key = $_GET['key'] ?? '';
        if ($key !== 'BAMZY-INITIAL-2026') {
            $userId = AuthMiddleware::handle();
            $this->checkAdmin($userId);
        }

        try {
            $migrator = new \BamzySMS\Core\Migrator($this->db);
            $results = $migrator->migrate();
            
            return $this->json([
                'status' => 'success',
                'message' => empty($results) ? 'Database already up to date.' : 'Migrations applied successfully.',
                'results' => $results
            ]);
        } catch (\Throwable $e) {
            return $this->json([
                'status' => 'error',
                'message' => 'Migration failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * SETUP: /api/admin/setup-master?key=BAMZY-INITIAL-2026
     */
    public function setupMasterAdmin() {
        $key = $_GET['key'] ?? '';
        if ($key !== 'BAMZY-INITIAL-2026') {
            return $this->json(['status' => 'error', 'message' => 'Invalid setup key.'], 403);
        }

        $stmt = $this->db->query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
        if ((int)$stmt->fetchColumn() > 0) {
            return $this->json(['status' => 'error', 'message' => 'Admin account already exists.'], 400);
        }

        $adminUsername = 'admin';
        $adminPass  = 'Admin@' . mt_rand(1000, 9999) . '!';
        $hashedPass = password_hash($adminPass, PASSWORD_DEFAULT);

        try {
            $stmt = $this->db->prepare("
                INSERT INTO users (username, name, phone, password, role)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([$adminUsername, 'Bamzy Admin', '0000000000', $hashedPass, 'admin']);

            return $this->json([
                'status' => 'success', 
                'message' => 'Master admin created.',
                'credentials' => [
                    'username' => $adminUsername,
                    'password' => $adminPass,
                    'note'     => 'Please log in and change your password immediately.'
                ]
            ]);
        } catch (\Throwable $e) {
            return $this->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}

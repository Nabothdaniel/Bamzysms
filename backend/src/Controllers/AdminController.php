<?php

namespace BamzySMS\Controllers;

use BamzySMS\Core\Controller;
use BamzySMS\Middleware\AuthMiddleware;
use BamzySMS\Models\User;
use BamzySMS\Models\Setting;
use BamzySMS\Models\Transaction;
use BamzySMS\Models\UsaNumber;
use BamzySMS\Services\SmsBowerClient;

class AdminController extends Controller {
    private $userModel;
    private $settingModel;
    private $transactionModel;
    private $usaNumberModel;
    private $smsClient;

    public function __construct() {
        $this->userModel        = new User();
        $this->settingModel     = new Setting();
        $this->transactionModel = new Transaction();
        $this->usaNumberModel   = new UsaNumber();
        $this->smsClient        = new SmsBowerClient();
    }

    /**
     * Check if the authenticated user is an admin.
     */
    private function checkAdmin($userId) {
        $user = $this->userModel->findById($userId);
        if (!$user || $user['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Admin access required.']);
            exit;
        }
        return $user;
    }

    /**
     * GET /api/admin/provider-balance
     */
    public function getProviderBalance() {
        $userId = AuthMiddleware::handle();
        $this->checkAdmin($userId);

        try {
            $balance = $this->smsClient->getBalance();
            return $this->json(['status' => 'success', 'balance' => $balance]);
        } catch (\Exception $e) {
            return $this->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/admin/users
     */
    public function getAllUsers() {
        $userId = AuthMiddleware::handle();
        $this->checkAdmin($userId);
        
        $users = $this->userModel->getAllUsers();
        return $this->json(['status' => 'success', 'data' => $users]);
    }

    /**
     * POST /api/admin/user/balance
     */
    public function updateUserBalance() {
        $userId = AuthMiddleware::handle();
        $this->checkAdmin($userId);
        
        $data = $this->getPostData();
        $targetUserId = (int)($data['userId'] ?? 0);
        $newBalance   = (float)($data['balance'] ?? 0);

        if (!$targetUserId) {
            return $this->json(['status' => 'error', 'message' => 'User ID required.'], 400);
        }

        $targetUser = $this->userModel->findById($targetUserId);
        if (!$targetUser) {
            return $this->json(['status' => 'error', 'message' => 'User not found.'], 404);
        }

        $oldBalance = (float)$targetUser['balance'];
        if ($this->userModel->updateBalance($targetUserId, $newBalance)) {
            // Log transaction
            $diff = $newBalance - $oldBalance;
            $desc = "Admin Adjustment: Set from ₦$oldBalance to ₦$newBalance";
            $this->transactionModel->create($targetUserId, abs($diff), $diff >= 0 ? 'credit' : 'debit', $desc);

            return $this->json(['status' => 'success', 'message' => 'Balance updated.']);
        }

        return $this->json(['status' => 'error', 'message' => 'Failed to update balance.'], 500);
    }

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
     * GET /api/admin/usa-numbers
     */
    public function getUsaNumbers() {
        $userId = AuthMiddleware::handle();
        $this->checkAdmin($userId);

        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 200;
        $numbers = $this->usaNumberModel->getAll($limit);

        return $this->json(['status' => 'success', 'data' => $numbers]);
    }

    /**
     * POST /api/admin/usa-numbers
     */
    public function uploadUsaNumbers() {
        $userId = AuthMiddleware::handle();
        $this->checkAdmin($userId);

        $data = $this->getPostData();
        $entries = $data['numbers'] ?? null;

        if (!is_array($entries)) {
            $singlePhone = trim((string)($data['phoneNumber'] ?? ''));
            $singleLink = trim((string)($data['receiveCodeLink'] ?? ''));
            $entries = [[
                'phoneNumber' => $singlePhone,
                'receiveCodeLink' => $singleLink,
            ]];
        }

        if (empty($entries)) {
            return $this->json(['status' => 'error', 'message' => 'At least one USA number is required.'], 400);
        }

        $created = [];
        $skipped = [];
        $errors = [];

        foreach ($entries as $index => $entry) {
            $phoneNumber = $this->normalizePhoneNumber((string)($entry['phoneNumber'] ?? ''));
            $receiveCodeLink = trim((string)($entry['receiveCodeLink'] ?? ''));

            if ($phoneNumber === '') {
                $errors[] = "Row " . ($index + 1) . ": phone number is required.";
                continue;
            }

            if ($receiveCodeLink === '' || !filter_var($receiveCodeLink, FILTER_VALIDATE_URL)) {
                $errors[] = "Row " . ($index + 1) . ": valid receive code link is required.";
                continue;
            }

            if ($this->usaNumberModel->findByPhoneNumber($phoneNumber)) {
                $skipped[] = [
                    'phoneNumber' => $phoneNumber,
                    'reason' => 'already_exists',
                ];
                continue;
            }

            try {
                $id = $this->usaNumberModel->create($phoneNumber, $receiveCodeLink, $userId);
                $created[] = [
                    'id' => $id,
                    'phoneNumber' => $phoneNumber,
                    'receiveCodeLink' => $receiveCodeLink,
                ];
            } catch (\Throwable $e) {
                $errors[] = "Row " . ($index + 1) . ": failed to save entry.";
            }
        }

        if (empty($created) && !empty($errors)) {
            return $this->json([
                'status' => 'error',
                'message' => 'No USA numbers were uploaded.',
                'errors' => $errors,
                'skipped' => $skipped,
            ], 422);
        }

        return $this->json([
            'status' => 'success',
            'message' => count($created) . ' USA number(s) uploaded successfully.',
            'data' => [
                'created' => $created,
                'skipped' => $skipped,
                'errors' => $errors,
            ],
        ]);
    }

    private function normalizePhoneNumber(string $phoneNumber): string {
        return preg_replace('/[^\d+]/', '', trim($phoneNumber)) ?? '';
    }
}

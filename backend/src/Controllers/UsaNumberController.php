<?php

namespace BamzySMS\Controllers;

use BamzySMS\Core\Controller;
use BamzySMS\Middleware\AuthMiddleware;
use BamzySMS\Models\UsaNumber;
use BamzySMS\Models\SystemEvent;
use BamzySMS\Models\User;

class UsaNumberController extends Controller {
    private UsaNumber $usaNumberModel;
    private User $userModel;
    private SystemEvent $eventModel;

    public function __construct() {
        $this->usaNumberModel = new UsaNumber();
        $this->userModel = new User();
        $this->eventModel = new SystemEvent();
    }

    /** GET /usa-numbers/available */
    public function getAvailable() {
        AuthMiddleware::handle();
        $search = trim((string)($_GET['search'] ?? ''));
        $limit  = max(1, min(200, (int)($_GET['limit'] ?? 100)));

        return $this->json([
            'status' => 'success',
            'data'   => $this->usaNumberModel->getAvailable($search, $limit),
        ]);
    }

    /** GET /usa-numbers/mine */
    public function getMine() {
        $userId = AuthMiddleware::handle();

        return $this->json([
            'status' => 'success',
            'data'   => $this->usaNumberModel->getOwnedByUser($userId),
        ]);
    }

    /** POST /usa-numbers/purchase */
    public function purchase() {
        $userId = AuthMiddleware::handle();
        $data   = $this->getPostData();

        $numberId = (int)($data['numberId'] ?? 0);
        $pin      = trim((string)($data['pin'] ?? ''));

        if ($numberId <= 0 || $pin === '') {
            return $this->json(['status' => 'error', 'message' => 'Number and PIN are required.'], 400);
        }

        if (!$this->userModel->verifyPin($userId, $pin)) {
            return $this->json(['status' => 'error', 'message' => 'Invalid transaction PIN.'], 401);
        }

        try {
            $purchase = $this->usaNumberModel->purchase($numberId, $userId);

            // Push balance update event
            $updatedUser = $this->userModel->findById($userId);
            $this->eventModel->log($userId, 'balance_updated', [
                'new_balance' => $updatedUser['balance'],
                'message'     => 'Balance updated after USA number purchase',
            ]);

            $this->eventModel->log($userId, 'notification', [
                'type'    => 'success',
                'message' => "USA number {$purchase['phone_number']} purchased — OTP fetched automatically.",
            ]);

            return $this->json([
                'status'  => 'success',
                'message' => 'USA number purchased — OTP retrieved.',
                'data'    => $purchase,
            ]);
        } catch (\Throwable $e) {
            return $this->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    /** POST /usa-numbers/refresh-otp */
    public function refreshOtp() {
        $userId = AuthMiddleware::handle();
        $data   = $this->getPostData();

        $numberId = (int)($data['numberId'] ?? 0);

        if ($numberId <= 0) {
            return $this->json(['status' => 'error', 'message' => 'Number ID is required.'], 400);
        }

        try {
            $otp = $this->usaNumberModel->refreshOtp($numberId, $userId);

            return $this->json([
                'status'  => 'success',
                'message' => $otp !== '' ? 'OTP refreshed.' : 'No OTP returned from redirect URL.',
                'data'    => ['otp_code' => $otp],
            ]);
        } catch (\Throwable $e) {
            return $this->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }
}

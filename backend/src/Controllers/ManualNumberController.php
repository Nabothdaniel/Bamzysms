<?php

namespace BamzySMS\Controllers;

use BamzySMS\Core\Controller;
use BamzySMS\Middleware\AuthMiddleware;
use BamzySMS\Models\ManualNumber;
use BamzySMS\Models\SystemEvent;
use BamzySMS\Models\User;

class ManualNumberController extends Controller {
    private ManualNumber $manualNumberModel;
    private User $userModel;
    private SystemEvent $eventModel;

    public function __construct() {
        $this->manualNumberModel = new ManualNumber();
        $this->userModel = new User();
        $this->eventModel = new SystemEvent();
    }

    public function getAvailableTelegram() {
        AuthMiddleware::handle();
        $search = trim((string)($_GET['search'] ?? ''));
        $limit = max(1, min(200, (int)($_GET['limit'] ?? 100)));

        return $this->json([
            'status' => 'success',
            'data' => $this->manualNumberModel->getAvailableTelegram($search, $limit),
        ]);
    }

    public function getMyTelegramNumbers() {
        $userId = AuthMiddleware::handle();

        return $this->json([
            'status' => 'success',
            'data' => $this->manualNumberModel->getOwnedByUser($userId, 'tg'),
        ]);
    }

    public function purchaseTelegram() {
        $userId = AuthMiddleware::handle();
        $data = $this->getPostData();
        $numberId = (int)($data['numberId'] ?? 0);
        $pin = trim((string)($data['pin'] ?? ''));

        if ($numberId <= 0) {
            return $this->json(['status' => 'error', 'message' => 'Number is required.'], 400);
        }

        if ($pin !== '' && !$this->userModel->verifyPin($userId, $pin)) {
            return $this->json(['status' => 'error', 'message' => 'Invalid transaction PIN.'], 401);
        }

        try {
            $purchase = $this->manualNumberModel->purchase($numberId, $userId);

            $updatedUser = $this->userModel->findById($userId);
            $this->eventModel->log($userId, 'balance_updated', [
                'new_balance' => $updatedUser['balance'],
                'message' => 'Balance updated after Telegram number purchase',
            ]);

            $this->eventModel->log($userId, 'notification', [
                'type' => 'success',
                'message' => "Telegram number {$purchase['phone_number']} purchased successfully",
            ]);

            return $this->json([
                'status' => 'success',
                'message' => 'Telegram number purchased successfully.',
                'data' => $purchase,
            ]);
        } catch (\Throwable $e) {
            return $this->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    public function requestCancellation() {
        $userId = AuthMiddleware::handle();
        $data = $this->getPostData();
        $numberId = (int)($data['numberId'] ?? 0);
        $reason = trim((string)($data['reason'] ?? ''));

        if ($numberId <= 0 || $reason === '') {
            return $this->json(['status' => 'error', 'message' => 'Number and cancellation reason are required.'], 400);
        }

        $ownedNumber = $this->manualNumberModel->findOwnedByUser($numberId, $userId);
        if (!$ownedNumber) {
            return $this->json(['status' => 'error', 'message' => 'Telegram number not found for this user.'], 404);
        }

        $requestId = $this->manualNumberModel->createCancellationRequest($numberId, $userId, $reason);
        $user = $this->userModel->findById($userId);
        $adminIds = $this->userModel->getAdminIds();

        foreach ($adminIds as $adminId) {
            $this->eventModel->log($adminId, 'notification', [
                'type' => 'info',
                'message' => "Telegram cancellation request from @{$user['username']} for {$ownedNumber['phone_number']}: {$reason}",
            ]);
        }

        $this->eventModel->log($userId, 'notification', [
            'type' => 'info',
            'message' => 'Your Telegram cancellation request has been sent to admin for review.',
        ]);

        return $this->json([
            'status' => 'success',
            'message' => 'Cancellation request sent to admin.',
            'data' => ['requestId' => $requestId],
        ]);
    }
}

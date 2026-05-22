<?php

namespace BamzySMS\Controllers;

use BamzySMS\Middleware\AuthMiddleware;
use BamzySMS\Models\UsaNumber;
use BamzySMS\Models\SystemEvent;

class AdminUsaNumberController extends AdminBaseController {
    private UsaNumber $usaNumberModel;
    private SystemEvent $eventHelper;

    public function __construct() {
        parent::__construct();
        $this->usaNumberModel = new UsaNumber();
        $this->eventHelper = new SystemEvent();
    }

    /** GET /admin/usa-numbers */
    public function getPaginatedNumbers() {
        $adminUserId = AuthMiddleware::handle();
        $this->checkAdmin($adminUserId);

        $page   = max(1, (int)($_GET['page'] ?? 1));
        $limit  = max(1, min(100, (int)($_GET['limit'] ?? 20)));
        $search = trim((string)($_GET['search'] ?? ''));
        $status = trim((string)($_GET['status'] ?? ''));

        $result = $this->usaNumberModel->getAdminPaginated($page, $limit, $search, $status);

        return $this->json([
            'status'     => 'success',
            'data'       => $result['data'],
            'pagination' => [
                'total' => $result['total'],
                'page'  => $result['page'],
                'limit' => $result['limit'],
                'pages' => $result['pages'],
            ],
        ]);
    }

    /** POST /admin/usa-numbers */
    public function createNumber() {
        $adminUserId = AuthMiddleware::handle();
        $this->checkAdmin($adminUserId);

        $data = $this->getPostData();
        $phone       = trim((string)($data['phone_number'] ?? ''));
        $serviceName = trim((string)($data['service_name'] ?? 'USA Number'));
        $category    = trim((string)($data['category'] ?? 'WhatsApp'));
        $redirectUrl = trim((string)($data['redirect_url'] ?? ''));
        $sellPrice   = (float)($data['sell_price'] ?? 0);

        if ($phone === '' || $redirectUrl === '' || $sellPrice <= 0) {
            return $this->json(['status' => 'error', 'message' => 'Phone number, redirect URL, and sell price are required.'], 400);
        }

        try {
            $id = $this->usaNumberModel->create([
                'phone_number' => $phone,
                'service_name' => $serviceName,
                'category' => $category,
                'redirect_url' => $redirectUrl,
                'sell_price'   => $sellPrice,
                'cost_price'   => max(0, (float)($data['cost_price'] ?? 0)),
                'notes'        => trim((string)($data['notes'] ?? '')),
                'uploaded_by'  => $adminUserId,
            ]);

            return $this->json([
                'status'  => 'success',
                'message' => 'USA number uploaded successfully.',
                'data'    => ['id' => $id],
            ]);
        } catch (\PDOException $e) {
            $isDuplicate = $e->getCode() === '23000';
            return $this->json([
                'status'  => 'error',
                'message' => $isDuplicate
                    ? 'This phone number already exists in the USA inventory.'
                    : 'Failed to upload number.',
            ], $isDuplicate ? 409 : 500);
        }
    }

    /** POST /admin/usa-numbers/bulk */
    public function bulkCreateNumbers() {
        $adminUserId = AuthMiddleware::handle();
        $this->checkAdmin($adminUserId);

        $data = $this->getPostData();
        $rows = $data['rows'] ?? [];

        if (!is_array($rows) || empty($rows)) {
            return $this->json(['status' => 'error', 'message' => 'At least one row is required.'], 400);
        }

        $result = $this->usaNumberModel->bulkCreate($rows, $adminUserId);

        return $this->json([
            'status'  => 'success',
            'message' => "{$result['created']} USA number(s) uploaded.",
            'data'    => [
                'created' => $result['created'],
                'failed'  => count($result['errors']),
                'errors'  => $result['errors'],
                'batch'   => $result['batch'],
            ],
        ]);
    }

    /** POST /admin/usa-numbers/update */
    public function updateNumber() {
        $adminUserId = AuthMiddleware::handle();
        $this->checkAdmin($adminUserId);

        $data        = $this->getPostData();
        $numberId    = (int)($data['numberId'] ?? 0);
        $phone       = trim((string)($data['phone_number'] ?? ''));
        $serviceName = trim((string)($data['service_name'] ?? 'USA Number'));
        $category    = trim((string)($data['category'] ?? 'WhatsApp'));
        $redirectUrl = trim((string)($data['redirect_url'] ?? ''));
        $sellPrice   = (float)($data['sell_price'] ?? 0);

        if ($numberId <= 0 || $phone === '' || $redirectUrl === '' || $sellPrice <= 0) {
            return $this->json(['status' => 'error', 'message' => 'Number ID, phone number, redirect URL, and sell price are required.'], 400);
        }

        try {
            $updated = $this->usaNumberModel->updateNumber($numberId, [
                'phone_number' => $phone,
                'service_name' => $serviceName,
                'category' => $category,
                'redirect_url' => $redirectUrl,
                'sell_price' => $sellPrice,
                'cost_price' => max(0, (float)($data['cost_price'] ?? 0)),
                'notes' => trim((string)($data['notes'] ?? '')),
            ]);

            if ($updated) {
                return $this->json(['status' => 'success', 'message' => 'USA number updated successfully.']);
            }
        } catch (\PDOException $e) {
            $isDuplicate = $e->getCode() === '23000';
            return $this->json([
                'status' => 'error',
                'message' => $isDuplicate
                    ? 'This phone number already exists in the USA inventory.'
                    : 'Failed to update USA number.',
            ], $isDuplicate ? 409 : 500);
        }

        return $this->json(['status' => 'error', 'message' => 'Failed to update USA number.'], 500);
    }

    /** POST /admin/usa-numbers/update-url */
    public function updateRedirectUrl() {
        $adminUserId = AuthMiddleware::handle();
        $this->checkAdmin($adminUserId);

        $data        = $this->getPostData();
        $numberId    = (int)($data['numberId'] ?? 0);
        $redirectUrl = trim((string)($data['redirect_url'] ?? ''));

        if ($numberId <= 0 || $redirectUrl === '') {
            return $this->json(['status' => 'error', 'message' => 'Number ID and redirect URL are required.'], 400);
        }

        if ($this->usaNumberModel->updateRedirectUrl($numberId, $redirectUrl)) {
            return $this->json(['status' => 'success', 'message' => 'Redirect URL updated.']);
        }

        return $this->json(['status' => 'error', 'message' => 'Failed to update redirect URL.'], 500);
    }

    /** DELETE /admin/usa-numbers */
    public function deleteNumber() {
        $adminUserId = AuthMiddleware::handle();
        $this->checkAdmin($adminUserId);

        $numberId = (int)($_GET['numberId'] ?? 0);

        if ($numberId <= 0) {
            return $this->json(['status' => 'error', 'message' => 'Number ID is required.'], 400);
        }

        if ($this->usaNumberModel->deleteNumber($numberId)) {
            return $this->json(['status' => 'success', 'message' => 'USA number deleted.']);
        }

        return $this->json(['status' => 'error', 'message' => 'Cannot delete — number may already be sold.'], 400);
    }
}

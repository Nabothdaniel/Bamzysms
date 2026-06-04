<?php

namespace BamzySMS\Controllers;

use BamzySMS\Core\Controller;
use BamzySMS\Models\User;
use BamzySMS\Models\Setting;
use BamzySMS\Models\Transaction;
use BamzySMS\Models\SystemEvent;
use BamzySMS\Core\Database;

abstract class AdminBaseController extends Controller {
    protected $userModel;
    protected $settingModel;
    protected $transactionModel;
    protected $eventModel;
    protected $db;

    public function __construct() {
        $this->userModel        = new User();
        $this->settingModel     = new Setting();
        $this->transactionModel = new Transaction();
        $this->eventModel       = new SystemEvent();
        $this->db               = Database::getInstance()->getConnection();
    }

    /**
     * Check if the authenticated user is an admin.
     */
    protected function checkAdmin($userId) {
        $user = $this->userModel->findById($userId);
        if (!$user) {
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized. Session invalid.']);
            exit;
        }
        if ($user['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => "Forbidden. Admin role required."]);
            exit;
        }
        return $user;
    }
}

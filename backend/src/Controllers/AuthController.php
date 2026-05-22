<?php

namespace BamzySMS\Controllers;

use BamzySMS\Core\Controller;
use BamzySMS\Models\User;
use BamzySMS\Models\Verification;
use BamzySMS\Services\PasswordService;
use BamzySMS\Services\WhatsAppService;

class AuthController extends Controller {
    private $userModel;
    private $verificationModel;
    private $whatsappService;
    private $passwordService;

    public function __construct($userModel = null, $verificationModel = null, $whatsappService = null, $passwordService = null) {
        $this->userModel = $userModel ?? new User();
        $this->verificationModel = $verificationModel ?? new Verification();
        $this->whatsappService = $whatsappService ?? new WhatsAppService();
        $this->passwordService = $passwordService ?? new PasswordService();
    }

    private function sanitizeUsername($username) {
        $username = strtolower(trim((string) $username));
        return preg_replace('/[^a-z0-9_]/', '', $username);
    }

    private function sanitizeText($value) {
        return trim(strip_tags((string) $value));
    }

    private function sanitizePhone($phone) {
        $phone = trim((string) $phone);
        return preg_replace('/[^0-9+]/', '', $phone);
    }

    public function sendOtp() {
        $data = $this->getPostData();
        $username = $this->sanitizeUsername($data['username'] ?? '');
        $type = $data['type'] ?? 'signup';

        if (!$username) {
            return $this->json(['status' => 'error', 'message' => 'Username is required'], 400);
        }

        // Check if user exists for reset
        if ($type === 'reset' && !$this->userModel->findByUsername($username)) {
            return $this->json(['status' => 'error', 'message' => 'No account found with this username'], 404);
        }

        // Generate 6-digit OTP
        $otp = sprintf("%06d", mt_rand(1, 999999));
        
        // Store in DB
        $this->verificationModel->create($username, $otp, $type);

        // Handle delivery
        $user = $this->userModel->findByUsername($username);
        $deliveredVia = 'logs';

        if ($user && !empty($user['whatsapp_number']) && !empty($user['whatsapp_notifications'])) {
            $this->whatsappService->sendOtp($user['whatsapp_number'], $otp);
            $deliveredVia = 'WhatsApp';
        }

        error_log("OTP_SIMULATION: OTP for $username is $otp (Delivered via $deliveredVia)");
        
        $msg = $deliveredVia === 'WhatsApp' 
            ? 'Verification code sent to your WhatsApp!' 
            : 'Verification code generated (Check logs in simulation mode)';

        return $this->json(['status' => 'success', 'message' => $msg]);
    }

    public function verifyOtp() {
        $data = $this->getPostData();
        $username = $this->sanitizeUsername($data['username'] ?? '');
        $otp = preg_replace('/\D/', '', (string) ($data['otp'] ?? ''));
        $type = $data['type'] ?? 'signup';

        if (!$username || !$otp) {
            return $this->json(['status' => 'error', 'message' => 'Username and OTP are required'], 400);
        }

        if ($this->verificationModel->verify($username, $otp, $type, $type === 'signup')) {
            return $this->json(['status' => 'success', 'message' => 'Verified successfully']);
        }

        return $this->json(['status' => 'error', 'message' => 'Invalid or expired OTP'], 400);
    }

    public function resetPassword() {
        $data = $this->getPostData();
        $username = $this->sanitizeUsername($data['username'] ?? '');
        $otp = preg_replace('/\D/', '', (string) ($data['otp'] ?? ''));
        $password = trim((string) ($data['password'] ?? ''));

        if (!$username || !$otp || !$password) {
            return $this->json(['status' => 'error', 'message' => 'All fields are required'], 400);
        }

        if (strlen($password) < 6) {
            return $this->json(['status' => 'error', 'message' => 'Password must be at least 6 characters'], 400);
        }

        if ($this->verificationModel->verify($username, $otp, 'reset')) {
            $this->userModel->updatePassword($username, $password);
            return $this->json(['status' => 'success', 'message' => 'Password reset successfully']);
        }

        return $this->json(['status' => 'error', 'message' => 'Invalid or expired verification session'], 400);
    }

    /**
     * POST /api/auth/reset-with-key
     * The "Proper" forgot password without email.
     */
    public function resetWithRecoveryKey() {
        $data = $this->getPostData();
        $username = $this->sanitizeUsername($data['username'] ?? '');
        $key = strtoupper(trim((string)($data['recovery_key'] ?? '')));
        $password = trim((string)($data['password'] ?? ''));

        if (!$username || !$key || !$password) {
            return $this->json(['status' => 'error', 'message' => 'Username, Recovery Key, and new Password are required.'], 400);
        }

        if (strlen($password) < 6) {
            return $this->json(['status' => 'error', 'message' => 'Password must be at least 6 characters.'], 400);
        }

        $user = $this->userModel->findByUsername($username);
        if (!$user) {
            return $this->json(['status' => 'error', 'message' => 'User not found.'], 404);
        }

        // Verify key
        if (!isset($user['recovery_key']) || !password_verify($key, $user['recovery_key'])) {
            return $this->json(['status' => 'error', 'message' => 'Invalid Recovery Key.'], 401);
        }

        // Update password
        $this->userModel->updatePassword($username, $password);

        return $this->json(['status' => 'success', 'message' => 'Password reset successfully using Recovery Key.']);
    }

    public function login() {
        $data = $this->getPostData();
        $username = $this->sanitizeUsername($data['username'] ?? '');
        $password = trim((string) ($data['password'] ?? ''));

        if (!$username || !$password) {
            return $this->json(['status' => 'error', 'message' => 'Username and password required'], 400);
        }

        // Only find by username
        $user = $this->userModel->findByUsername($username);

        if ($user && $this->passwordService->verify($password, $user['password'] ?? null)) {
            if (
                isset($user['id']) &&
                method_exists($this->userModel, 'updatePasswordHashById') &&
                $this->passwordService->shouldUpgrade($user['password'] ?? null)
            ) {
                $this->userModel->updatePasswordHashById((int) $user['id'], $this->passwordService->hash($password));
            }

            $token = \BamzySMS\Core\JwtHelper::generate([
                'id' => $user['id'],
                'username' => $user['username'] ?? '',
                'role' => $user['role']
            ]);

            // Re-use fetched data, just remove sensitive fields
            unset($user['password']);
            unset($user['transaction_pin']);
            unset($user['recovery_key']);
            unset($user['token']);

            return $this->json([
                'status' => 'success',
                'data' => [
                    'token' => $token,
                    'user' => $user
                ]
            ]);
        }

        return $this->json(['status' => 'error', 'message' => 'Invalid credentials'], 401);
    }

    public function register() {
        $data = $this->getPostData();
        $username = $this->sanitizeUsername($data['username'] ?? '');
        $password = trim((string) ($data['password'] ?? ''));
        $confirmPassword = trim((string) ($data['confirm_password'] ?? ($data['confirm'] ?? '')));
        $name = $this->sanitizeText($data['name'] ?? '');
        $phone = $this->sanitizePhone($data['phone'] ?? '');

        if (!$username) {
            return $this->json(['status' => 'error', 'message' => 'username is required'], 400);
        }

        if (!$password) {
            return $this->json(['status' => 'error', 'message' => 'password is required'], 400);
        }

        if ($confirmPassword === '') {
            // confirm_password is optional: frontend validates match before sending.
            // Skip comparison if not provided.
        } elseif ($password !== $confirmPassword) {
            error_log("[DIAG] Password Mismatch - P1 length: " . strlen($password) . ", P2 length: " . strlen($confirmPassword));
            return $this->json(['status' => 'error', 'message' => 'Passwords do not match'], 400);
        }

        if (strlen($username) < 3) {
            return $this->json(['status' => 'error', 'message' => 'Username must be at least 3 characters'], 400);
        }

        if (strlen($password) < 6) {
            return $this->json(['status' => 'error', 'message' => 'Password must be at least 6 characters'], 400);
        }

        if ($this->userModel->findByUsername($username)) {
            return $this->json(['status' => 'error', 'message' => 'Username already exists'], 400);
        }

        try {
            $result = $this->userModel->create([
                'username' => $username,
                'name' => $name ?: $username,
                'phone' => $phone ?: null,
                'password' => $password
            ]);
            
            $userId = $result['id'];
            $recoveryKey = $result['recovery_key'];
            
            $userData = $this->userModel->findById($userId);
            
            $token = \BamzySMS\Core\JwtHelper::generate([
                'id' => $userData['id'],
                'username' => $userData['username'],
                'role' => $userData['role']
            ]);

            return $this->json([
                'status' => 'success',
                'data' => [
                    'token' => $token,
                    'user' => $userData,
                    'recovery_key' => $recoveryKey
                ]
            ], 201);
        } catch (\Exception $e) {
            return $this->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/auth/me
     * Get current user via JWT
     */
    public function getMe() {
        $userId = \BamzySMS\Middleware\AuthMiddleware::handle();
        $user = $this->userModel->findById($userId);
        
        if (!$user) {
            return $this->json(['status' => 'error', 'message' => 'User not found'], 404);
        }

        return $this->json([
            'status' => 'success',
            'data' => $user
        ]);
    }
}

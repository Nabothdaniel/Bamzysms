<?php

require_once __DIR__ . '/../src/bootstrap.php';

use BamzySMS\Controllers\AuthController;
use BamzySMS\Core\Controller;
use BamzySMS\Services\PasswordService;

class FakeUserModel {
    public $createdData = null;
    public $existingUser = null;
    public $updatedPasswordHash = null;

    public function findByUsername($username) {
        if ($this->existingUser && $this->existingUser['username'] === $username) {
            return $this->existingUser;
        }
        return null;
    }

    public function create($data) {
        $this->createdData = $data;
        return [
            'id' => 77,
            'recovery_key' => 'BAMZY-ABCD-EFGH',
        ];
    }

    public function findById($id) {
        return [
            'id' => $id,
            'username' => $this->createdData['username'] ?? 'tester001',
            'name' => $this->createdData['name'] ?? 'Tester',
            'phone' => $this->createdData['phone'] ?? null,
            'balance' => 0,
            'role' => 'user',
            'created_at' => '2026-04-15 00:00:00',
        ];
    }

    public function updatePassword($username, $password) {
        return true;
    }

    public function updatePasswordHashById($id, $passwordHash) {
        $this->updatedPasswordHash = ['id' => $id, 'hash' => $passwordHash];
        return true;
    }
}

class FakeVerificationModel {
    public function verify($username, $otp, $type, $deleteAfter = true) {
        return true;
    }

    public function create($username, $otp, $type = 'signup') {
        return true;
    }
}

class TestableAuthController extends AuthController {
    private $payload = [];
    public $lastJson = null;

    public function withPayload(array $payload) {
        $this->payload = $payload;
        return $this;
    }

    protected function getPostData() {
        return $this->payload;
    }

    protected function json($data, $status = 200) {
        $this->lastJson = ['statusCode' => $status, 'body' => $data];
        return $this->lastJson;
    }
}

class TestableCoreController extends Controller {
    public function normalize(array $payload) {
        return $this->normalizeIncomingData($payload);
    }
}

function assertSameValue($expected, $actual, $message) {
    if ($expected !== $actual) {
        throw new Exception($message . " Expected: " . var_export($expected, true) . " Actual: " . var_export($actual, true));
    }
}

function assertMatches($pattern, $actual, $message) {
    if (!preg_match($pattern, (string)$actual)) {
        throw new Exception($message . " Actual: " . var_export($actual, true));
    }
}

function encryptForFrontend($value, $key) {
    $iv = random_bytes(openssl_cipher_iv_length('aes-256-cbc'));
    $ciphertext = openssl_encrypt(
        $value,
        'aes-256-cbc',
        hash('sha256', $key, true),
        OPENSSL_RAW_DATA,
        $iv
    );

    return base64_encode($iv . $ciphertext);
}

$userModel = new FakeUserModel();
$verificationModel = new FakeVerificationModel();
$controller = new TestableAuthController($userModel, $verificationModel);
$coreController = new TestableCoreController();

$activeEncryptionKey = env_or_default(
    'PLATFORM_ENCRYPTION_KEY',
    env_or_default('NEXT_PUBLIC_ENCRYPTION_KEY', 'BAMZY-DEFAULT-KEY-2026')
);

$normalized = $coreController->normalize([
    'password' => encryptForFrontend('secret123', $activeEncryptionKey),
    'confirm_password' => 'secret123',
]);
assertSameValue('secret123', $normalized['password'], 'password should be decrypted with the shared encryption key.');
assertSameValue('secret123', $normalized['confirm_password'], 'plain confirmation should remain unchanged after normalization.');

$result = $controller->withPayload([])->login();
assertSameValue(400, $result['statusCode'], 'login should reject missing credentials.');
assertMatches('/Username and password required/i', $result['body']['message'] ?? '', 'login error message mismatch.');

$result = $controller->withPayload([
    'username' => 'tester001',
    'password' => 'secret123',
])->register();
assertSameValue(201, $result['statusCode'], 'register should allow frontend-validated signups without confirm_password.');

$result = $controller->withPayload([
    'username' => 'tester001',
    'password' => 'secret123',
    'confirm_password' => 'mismatch123',
])->register();
assertSameValue(400, $result['statusCode'], 'register should reject mismatched passwords.');
assertMatches('/Passwords do not match/i', $result['body']['message'] ?? '', 'register mismatch message mismatch.');

$result = $controller->withPayload([
    'username' => '  TesTer_001<script> ',
    'name' => '  <b>Daniel User</b> ',
    'phone' => ' +234 801-234-5678 ',
    'password' => 'secret123',
    'confirm_password' => 'secret123',
])->register();

assertSameValue(201, $result['statusCode'], 'register should succeed with valid payload.');
assertSameValue('tester_001script', $userModel->createdData['username'], 'username should be normalized and sanitized.');
assertSameValue('Daniel User', $userModel->createdData['name'], 'name should be sanitized.');
assertSameValue('+2348012345678', $userModel->createdData['phone'], 'phone should be sanitized.');

$passwordService = new PasswordService();
$userModel->existingUser = [
    'id' => 55,
    'username' => 'legacyuser',
    'password' => 'legacy-pass',
    'role' => 'user',
];

$result = $controller->withPayload([
    'username' => 'legacyuser',
    'password' => 'legacy-pass',
])->login();
assertSameValue(200, $result['statusCode'], 'login should accept legacy plain-text passwords.');
assertSameValue(55, $userModel->updatedPasswordHash['id'] ?? null, 'legacy login should upgrade the stored password.');
assertSameValue(true, $passwordService->verify('legacy-pass', $userModel->updatedPasswordHash['hash'] ?? null), 'upgraded password hash should verify correctly.');

echo "AuthController tests passed.\n";

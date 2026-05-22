<?php

use BamzySMS\Core\Router;

$router = new Router();

// Health Check
$router->add('GET', '/',                       'UtilsController',       'healthCheck');

// Auth
$router->add('POST', '/auth/login',          'AuthController',        'login');
$router->add('POST', '/auth/register',        'AuthController',        'register');
$router->add('POST', '/auth/send-otp',        'AuthController',        'sendOtp');
$router->add('POST', '/auth/verify-otp',      'AuthController',        'verifyOtp');
$router->add('POST', '/auth/reset-password',  'AuthController',        'resetPassword');
$router->add('POST', '/auth/reset-with-key',  'AuthController',        'resetWithRecoveryKey');
$router->add('GET',  '/auth/me',             'AuthController',        'getMe');

// User
$router->add('GET',  '/user/profile',         'UserController',        'getProfile');
$router->add('GET',  '/user/balance',         'UserController',        'getBalance');
$router->add('POST', '/user/update-pin',      'UserController',        'updatePin');
$router->add('POST', '/user/verify-pin',      'UserController',        'verifyPin');
$router->add('GET',  '/user/security',        'UserController',        'getSecurityInfo');
$router->add('POST', '/user/security',        'UserController',        'updateSecuritySettings');
$router->add('POST', '/user/confirm-key-saved','UserController',        'confirmRecoveryKeySaved');
$router->add('POST', '/user/regenerate-recovery-key', 'UserController',      'regenerateRecoveryKey');
$router->add('POST', '/user/reveal-recovery-key',     'UserController',      'revealRecoveryKey');
$router->add('GET',  '/transactions',         'TransactionController', 'getHistory');
$router->add('POST', '/purchase',             'TransactionController', 'purchase');

// Services & Countries (live from SMSBower)
$router->add('GET',  '/services',             'ServiceController',     'getServices');
$router->add('GET',  '/countries',            'ServiceController',     'getCountries');
$router->add('GET',  '/prices',               'ServiceController',     'getPrices');
$router->add('GET',  '/available',            'ServiceController',     'getAvailable');

// SMS / Activations
$router->add('POST', '/sms/buy',              'SMSController',         'buy');
$router->add('POST', '/sms/reveal',           'SMSController',         'getPlainNumber');
$router->add('GET',  '/sms/purchases',        'SMSController',         'getPurchases');
$router->add('GET',  '/sms/status',           'SMSController',         'getStatus');
$router->add('POST', '/sms/set-status',       'SMSController',         'setActivationStatus');
$router->add('POST', '/sms/hide',             'SMSController',         'hide');

// Manual / Admin-managed numbers
$router->add('GET',  '/manual-numbers/telegram',          'ManualNumberController',      'getAvailableTelegram');
$router->add('GET',  '/manual-numbers/telegram/mine',     'ManualNumberController',      'getMyTelegramNumbers');
$router->add('POST', '/manual-numbers/telegram/purchase', 'ManualNumberController',      'purchaseTelegram');
$router->add('POST', '/manual-numbers/telegram/cancel-request', 'ManualNumberController', 'requestCancellation');

// Admin - Users
$router->add('GET',    '/admin/users',          'AdminUserController',   'getAllUsers');
$router->add('POST',   '/admin/users',          'AdminUserController',   'createUser');
$router->add('PUT',    '/admin/users',          'AdminUserController',   'updateUser');
$router->add('DELETE', '/admin/users',          'AdminUserController',   'deleteUser');
$router->add('POST',   '/admin/user/topup',     'AdminUserController',   'topUpUserBalance');
$router->add('POST',   '/admin/user/balance',   'AdminUserController',   'updateUserBalance');
$router->add('GET',    '/admin/transactions',   'AdminUserController',   'getAllTransactions');
$router->add('POST',   '/admin/user/reset-password', 'AdminUserController', 'sudoResetPassword');
$router->add('POST',   '/admin/user/reset-recovery-key', 'AdminUserController', 'resetUserRecoveryKey');
$router->add('POST',   '/admin/user/reveal-recovery-key', 'AdminUserController', 'revealUserRecoveryKey');
$router->add('GET',    '/admin/promote-me',     'AdminUserController',   'promoteToAdmin');

// Admin - Pricing & Services
$router->add('GET',    '/admin/pricing/overrides', 'AdminPricingController', 'getPricingOverrides');
$router->add('POST',   '/admin/pricing/update',    'AdminPricingController', 'updatePricingOverride');
$router->add('POST',   '/admin/pricing/bulk-update','AdminPricingController', 'bulkUpdatePricingOverrides');
$router->add('DELETE', '/admin/pricing/delete',    'AdminPricingController', 'deletePricingOverride');
$router->add('GET',    '/admin/pricing/services',  'AdminPricingController', 'getPaginatedServices');
$router->add('POST',   '/admin/exchange-rate/refresh', 'AdminPricingController', 'refreshExchangeRate');
$router->add('GET',    '/admin/countries',         'AdminPricingController', 'getCountries');
$router->add('GET',    '/admin/manual-numbers',    'AdminManualNumberController', 'getPaginatedNumbers');
$router->add('POST',   '/admin/manual-numbers',    'AdminManualNumberController', 'createNumber');
$router->add('POST',   '/admin/manual-numbers/bulk', 'AdminManualNumberController', 'bulkCreateNumbers');
$router->add('POST',   '/admin/manual-numbers/otp', 'AdminManualNumberController', 'updateOtpCode');
$router->add('GET',    '/admin/manual-numbers/cancellation-requests', 'AdminManualNumberController', 'getCancellationRequests');

// Admin - System
$router->add('GET',  '/admin/settings',         'AdminSystemController', 'getSettings');
$router->add('POST', '/admin/settings',        'AdminSystemController', 'updateSettings');
$router->add('GET',  '/admin/logs',             'AdminSystemController', 'getSystemLogs');
$router->add('GET',  '/admin/analytics',        'AdminSystemController', 'getAnalytics');
$router->add('GET',  '/admin/provider-balance', 'AdminSystemController', 'getProviderBalance');
$router->add('GET',  '/admin/provider/status',  'AdminSystemController', 'getProviderStatus');
$router->add('GET',  '/admin/run-migrations',   'AdminSystemController', 'runMigrations');
$router->add('GET',  '/admin/setup-master',     'AdminSystemController', 'setupMasterAdmin');

// Payment — Virtual Account (PaymentPoint)
$router->add('GET',  '/payment/virtual-account', 'PaymentController',     'getVirtualAccount');

// Webhook & Events (Custom Reactivity)
$router->add('POST', '/webhook/payment',          'WebhookController',     'handlePayment');
$router->add('POST', '/webhook/paymentpoint',     'WebhookController',     'handlePaymentPoint');
$router->add('GET',  '/webhook/paymentpoint',     'WebhookController',     'checkPaymentPoint');
$router->add('GET',  '/events/stream',            'EventController',       'stream');
$router->add('GET',  '/notifications',            'EventController',       'getNotifications');
$router->add('POST', '/notifications/mark-read',  'EventController',       'markRead');

// USA Numbers — User-facing (Beta)
$router->add('GET',  '/usa-numbers/available',   'UsaNumberController',      'getAvailable');
$router->add('GET',  '/usa-numbers/mine',        'UsaNumberController',      'getMine');
$router->add('POST', '/usa-numbers/purchase',    'UsaNumberController',      'purchase');
$router->add('POST', '/usa-numbers/refresh-otp', 'UsaNumberController',      'refreshOtp');

// USA Numbers — Admin
$router->add('GET',    '/admin/usa-numbers',            'AdminUsaNumberController', 'getPaginatedNumbers');
$router->add('POST',   '/admin/usa-numbers',            'AdminUsaNumberController', 'createNumber');
$router->add('POST',   '/admin/usa-numbers/bulk',       'AdminUsaNumberController', 'bulkCreateNumbers');
$router->add('POST',   '/admin/usa-numbers/update',     'AdminUsaNumberController', 'updateNumber');
$router->add('POST',   '/admin/usa-numbers/update-url', 'AdminUsaNumberController', 'updateRedirectUrl');
$router->add('DELETE', '/admin/usa-numbers',            'AdminUsaNumberController', 'deleteNumber');

// Utils
$router->add('GET',  '/utils/server-ip',      'UtilsController',       'getServerIp');

return $router;

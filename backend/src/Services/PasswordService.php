<?php

namespace BamzySMS\Services;

class PasswordService {
    public function hash(string $password): string {
        return password_hash($password, PASSWORD_DEFAULT);
    }

    public function verify(string $plainPassword, ?string $storedPassword): bool {
        if (!is_string($storedPassword) || $storedPassword === '') {
            return false;
        }

        if ($this->looksHashed($storedPassword)) {
            return password_verify($plainPassword, $storedPassword);
        }

        return hash_equals($storedPassword, $plainPassword);
    }

    public function shouldUpgrade(?string $storedPassword): bool {
        if (!is_string($storedPassword) || $storedPassword === '') {
            return false;
        }

        if (!$this->looksHashed($storedPassword)) {
            return true;
        }

        return password_needs_rehash($storedPassword, PASSWORD_DEFAULT);
    }

    private function looksHashed(string $value): bool {
        return str_starts_with($value, '$2y$')
            || str_starts_with($value, '$argon2i$')
            || str_starts_with($value, '$argon2id$');
    }
}

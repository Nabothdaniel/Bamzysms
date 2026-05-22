export type LoginFormValues = {
  username: string;
  password: string;
};

export type RegisterFormValues = {
  username: string;
  name: string;
  phone: string;
  password: string;
  confirm: string;
};

export type ForgotPasswordFormValues = {
  username: string;
  otp: string;
  recovery_key: string;
  password: string;
  confirm: string;
};

export function validatePasswordConfirmation(password: string, confirm: string): string | null {
  if (!password || !confirm) {
    return 'Please fill in both password fields.';
  }

  if (password !== confirm) {
    return 'Passwords do not match.';
  }

  if (password.length < 6) {
    return 'Password must be at least 6 characters.';
  }

  return null;
}

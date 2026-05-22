'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RiUserLine, RiPhoneLine,
  RiArrowRightLine
} from 'react-icons/ri';
import { useAppStore } from '@/store/appStore';
import PageLoader from '@/components/ui/PageLoader';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthBrand from '@/components/auth/AuthBrand';
import AuthTextField from '@/components/auth/AuthTextField';
import AuthPasswordField from '@/components/auth/AuthPasswordField';
import { authService } from '@/lib/api';
import { validatePasswordConfirmation, type RegisterFormValues } from '@/lib/auth/forms';

export default function RegisterPage() {
  const router = useRouter();
  const { login, addToast } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [form, setForm] = useState<RegisterFormValues>({ 
    username: '',
    name: '', 
    phone: '', 
    password: '', 
    confirm: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password || !form.confirm) {
      addToast('Please fill in required details.', 'error'); return;
    }

    const passwordError = validatePasswordConfirmation(form.password, form.confirm);
    if (passwordError) {
      addToast(passwordError, 'error'); return;
    }

    setLoading(true);
    try {
      const response = await authService.register({
        username: form.username.trim(),
        name: form.name.trim() || form.username.trim(),
        phone: form.phone.trim(),
        password: form.password,
        // confirm_password omitted — frontend already validated passwords match;
        // sending both fields encrypted produces different ciphertexts (random IV)
        // causing the backend compare to always fail
      });
      login(response.data.user, response.data.token);
      const key = response.data.recovery_key;
      addToast('Welcome home!', 'success');
      router.push(`/onboarding?key=${key}`);
    } catch (error: any) {
      addToast(error.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {loading && <PageLoader />}
      
      <div style={{ paddingBottom: 24 }}>
        <AuthBrand />

        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', marginBottom: 8 }}>
          Create Account
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', marginBottom: 32 }}>
          Sign up with your username and password
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <AuthTextField
            label="Username"
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="Choose a username"
            icon={RiUserLine}
            required
          />

          <AuthTextField
            label="Full Name (Optional)"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. John Doe"
            icon={RiUserLine}
          />

          <AuthTextField
            label="Phone Number (Optional)"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            placeholder="+234..."
            icon={RiPhoneLine}
          />

          <AuthPasswordField
            label="Password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Create password"
            visible={showPass}
            onToggleVisibility={() => setShowPass((value) => !value)}
            required
          />

          <AuthPasswordField
            label="Confirm Password"
            name="confirm"
            value={form.confirm}
            onChange={handleChange}
            placeholder="Confirm password"
            visible={showConfirm}
            onToggleVisibility={() => setShowConfirm((value) => !value)}
            required
          />

          <button type="submit" className="btn-primary"
            disabled={loading}
            style={{ padding: '15px', width: '100%', fontSize: '1rem', marginTop: 10 }}>
            {loading ? 'Creating Account...' : 'Sign Up'} <RiArrowRightLine size={18} />
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 32, fontSize: '0.95rem', color: 'var(--color-text-muted)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }}>
            Sign In
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

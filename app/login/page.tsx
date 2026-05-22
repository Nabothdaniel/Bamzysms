'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RiUserLine } from 'react-icons/ri';
import { useAppStore } from '@/store/appStore';
import PageLoader from '@/components/ui/PageLoader';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthBrand from '@/components/auth/AuthBrand';
import AuthTextField from '@/components/auth/AuthTextField';
import AuthPasswordField from '@/components/auth/AuthPasswordField';
import { authService } from '@/lib/api';
import type { LoginFormValues } from '@/lib/auth/forms';

export default function LoginPage() {
  const router = useRouter();
  const { login, addToast } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState<LoginFormValues>({ username: '', password: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!form.username || !form.password) { addToast('Please fill in all fields.', 'error'); return; }
    setLoading(true);
    try {
      const response = await authService.login({
        username: form.username.trim(),
        password: form.password
      });
      login(response.data.user, response.data.token);
      addToast('Welcome back!', 'success');

      // Direct redirect based on role
      if (response.data.user.role === 'admin') {
        router.push('/dashboard/admin/dashboard');
      } else {
        router.push('/dashboard/user');
      }
    } catch (error: any) {
      addToast(error.message || 'Login failed', 'error');
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
          Welcome Back
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', marginBottom: 32 }}>
          Enter your details to access your account
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <AuthTextField
            label="Username"
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="Enter your username"
            icon={RiUserLine}
          />

          <AuthPasswordField
            label="Password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter password"
            visible={showPass}
            onToggleVisibility={() => setShowPass((value) => !value)}
            auxiliaryLink={{ href: '/forgot-password', label: 'Forgot?' }}
          />

          <button type="submit" className="btn-primary"
            disabled={loading}
            style={{ padding: '15px', width: '100%', fontSize: '1rem', marginTop: 10 }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 32, fontSize: '0.95rem', color: 'var(--color-text-muted)' }}>
          New to BamzySMS?{' '}
          <Link href="/register" style={{ color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }}>
            Create an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

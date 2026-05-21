'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RiEyeLine, RiEyeOffLine, RiMailLine, RiLockLine, RiSignalTowerFill } from 'react-icons/ri';
import { useAppStore } from '@/store/appStore';
import PageLoader from '@/components/ui/PageLoader';
import AuthLayout from '@/components/auth/AuthLayout';
import { authService } from '@/lib/api';
import { getDashboardBasePath } from '@/lib/dashboard-paths';

export default function LoginPage() {
  const router = useRouter();
  const { login, addToast } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) { addToast('Please fill in all fields.', 'error'); return; }
    setLoading(true);
    try {
      const response = await authService.login(form);
      localStorage.setItem('bamzysms-token', response.data.token);
      login(response.data.user);
      addToast('Welcome back!', 'success');
      router.push(getDashboardBasePath(response.data.user.role));
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
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px var(--color-primary-glow)',
          }}>
            <RiSignalTowerFill size={20} color="#fff" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}>
            bamzy<span style={{ color: 'var(--color-primary)' }}>SMS</span>
          </span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', marginBottom: 8 }}>
          Welcome Back
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', marginBottom: 32 }}>
          Enter your details to access your account
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)', display: 'flex' }}>
                <RiMailLine size={18} />
              </span>
              <input
                name="email" type="email" className="input-field"
                placeholder="name@example.com" value={form.email}
                onChange={handleChange} style={{ paddingLeft: 44 }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Password</label>
              <Link href="/forgot-password" style={{ color: 'var(--color-primary)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600 }}>
                Forgot?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)', display: 'flex' }}>
                <RiLockLine size={18} />
              </span>
              <input
                name="password" type={showPass ? 'text' : 'password'}
                className="input-field" placeholder="Enter password"
                value={form.password} onChange={handleChange}
                style={{ paddingLeft: 44, paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-faint)', display: 'flex' }}>
                {showPass ? <RiEyeOffLine size={18} /> : <RiEyeLine size={18} />}
              </button>
            </div>
          </div>

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

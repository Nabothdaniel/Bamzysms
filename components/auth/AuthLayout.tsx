'use client';

import React from 'react';
import Link from 'next/link';
import { RiArrowLeftLine } from 'react-icons/ri';
import AuthCarousel from './AuthCarousel';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-white">
      <div className="flex flex-1 flex-col items-center justify-center p-10 bg-[var(--color-bg)] relative">
        <Link
          href="/"
          className="absolute top-6 left-6 flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors"
        >
          <RiArrowLeftLine size={18} /> Back to home
        </Link>
        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </div>
      <AuthCarousel />
    </div>
  );
}

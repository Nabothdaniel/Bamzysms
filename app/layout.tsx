/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from 'next';
import './globals.css';
import ToastContainer from '@/components/ui/Toast';
import AuthProvider from '@/components/auth/AuthProvider';

export const metadata: Metadata = {
  title: 'BamzySMS — Virtual Phone Numbers for OTP Verification',
  description:
    "Buy premium virtual phone numbers for instant SMS/OTP verification on Telegram, WhatsApp, Instagram, Facebook and more. Starting from ₦2,000.",
  keywords: ['virtual phone number', 'OTP verification', 'Nigeria', 'SMS verification', 'BamzySMS'],
  authors: [{ name: 'BamzySMS' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="bg-[#F0F1F3] text-[#111827] min-h-screen">
        <AuthProvider>
          {children}
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
}

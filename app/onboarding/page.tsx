'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RiArrowRightLine, RiArrowLeftLine, RiCheckLine } from 'react-icons/ri';
import { useAppStore } from '@/store/appStore';
import { getDashboardBasePath } from '@/lib/dashboard-paths';

const QUESTIONS = [
  {
    id: 'services',
    question: 'Which services are you most interested in?',
    options: ['WhatsApp', 'Telegram', 'Instagram', 'Google/Gmail', 'Payment Platforms', 'Other'],
    multiple: true
  },
  {
    id: 'volume',
    question: 'What is your expected monthly OTP volume?',
    options: ['1-10', '10-50', '50-200', '200+', 'Just testing'],
    multiple: false
  },
  {
    id: 'discovery',
    question: 'How did you hear about BamzySMS?',
    options: ['Google Search', 'Social Media', 'Friend/Referral', 'Advertisement', 'Other'],
    multiple: false
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const handleSelect = (option: string) => {
    const q = QUESTIONS[currentStep];
    if (q.multiple) {
      const current = answers[q.id] || [];
      const updated = current.includes(option) 
        ? current.filter((o: string) => o !== option)
        : [...current, option];
      setAnswers({ ...answers, [q.id]: updated });
    } else {
      setAnswers({ ...answers, [q.id]: option });
    }
  };

  const next = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      finish();
    }
  };

  const skip = () => finish();

  const finish = () => {
    // In a real app, we'd save answers to the backend here
    router.push(getDashboardBasePath(user?.role));
  };

  const q = QUESTIONS[currentStep];
  const progress = ((currentStep + 1) / QUESTIONS.length) * 100;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Link href="/" className="go-back-btn">
        <RiArrowLeftLine size={18} /> Exit Onboarding
      </Link>

      <div style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 'var(--radius-xl)', padding: '40px', boxShadow: '0 4px 30px rgba(0,0,0,0.03)' }}>
        {/* Progress */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8 }}>
            <span>Step {currentStep + 1} of {QUESTIONS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div style={{ width: '100%', height: 6, background: 'var(--color-border)', borderRadius: 10 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--color-primary)', borderRadius: 10, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 12, lineHeight: 1.2 }}>{q.question}</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 32, fontSize: '0.95rem' }}>
          {q.multiple ? 'Select all that apply' : 'Select one option'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
          {q.options.map((option) => {
            const isSelected = q.multiple 
              ? (answers[q.id] || []).includes(option)
              : answers[q.id] === option;
            
            return (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                style={{
                  padding: '16px 20px', textAlign: 'left', borderRadius: 'var(--radius-lg)',
                  border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: isSelected ? 'var(--color-primary-dim)' : 'transparent',
                  color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                  fontWeight: 600, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.2s'
                }}
              >
                {option}
                {isSelected && <RiCheckLine size={20} />}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button onClick={skip} style={{ background: 'none', border: 'none', color: 'var(--color-text-faint)', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>
            Skip for now
          </button>
          <button 
            disabled={!answers[q.id] || answers[q.id].length === 0}
            onClick={next} 
            className="btn-primary" 
            style={{ flex: 1, padding: '16px', fontSize: '1rem' }}
          >
            {currentStep === QUESTIONS.length - 1 ? 'Get Started' : 'Continue'} <RiArrowRightLine size={18} />
          </button>
        </div>
      </div>
    </main>
  );
}

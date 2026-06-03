'use client';

import React from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Topbar from '@/components/dashboard/Topbar';

export interface DashboardBreadcrumbItem {
  label: string;
  href?: string;
}

interface DashboardPageShellProps {
  title: string;
  children: React.ReactNode;
  breadcrumbs?: DashboardBreadcrumbItem[];
  maxWidth?: number;
  contentStyle?: React.CSSProperties;
  className?: string;
  noPadding?: boolean;
}

export default function DashboardPageShell({
  title,
  children,
  breadcrumbs,
  maxWidth = 1440,
  contentStyle,
  className,
  noPadding = false,
}: DashboardPageShellProps) {
  return (
    <DashboardLayout>
      <Topbar title={title} />
      <main
        className={`${noPadding ? '' : 'px-4 py-6 md:px-8 md:py-8'} w-full ${className || ''}`}
        style={contentStyle}
      >
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 text-[0.85rem] font-semibold text-slate-400">
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <React.Fragment key={`${item.label}-${index}`}>
                  {item.href && !isLast ? (
                    <Link href={item.href} className="text-inherit hover:text-primary transition-colors">
                      {item.label}
                    </Link>
                  ) : (
                    <span className={isLast ? 'text-primary' : ''}>{item.label}</span>
                  )}
                  {!isLast && <span>/</span>}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {children}
      </main>
    </DashboardLayout>
  );
}

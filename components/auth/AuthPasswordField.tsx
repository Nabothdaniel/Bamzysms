import React from 'react';
import Link from 'next/link';
import { RiEyeLine, RiEyeOffLine, RiLockLine } from 'react-icons/ri';

type AuthPasswordFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  visible: boolean;
  onToggleVisibility: () => void;
  required?: boolean;
  auxiliaryLink?: {
    href: string;
    label: string;
  };
};

export default function AuthPasswordField({
  label,
  name,
  value,
  onChange,
  placeholder,
  visible,
  onToggleVisibility,
  required = false,
  auxiliaryLink,
}: AuthPasswordFieldProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{label}</label>
        {auxiliaryLink ? (
          <Link
            href={auxiliaryLink.href}
            style={{ color: 'var(--color-primary)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600 }}
          >
            {auxiliaryLink.label}
          </Link>
        ) : null}
      </div>
      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-faint)',
            display: 'flex',
          }}
        >
          <RiLockLine size={18} />
        </span>
        <input
          name={name}
          type={visible ? 'text' : 'password'}
          className="input-field"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          style={{ paddingLeft: 44, paddingRight: 44 }}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          style={{
            position: 'absolute',
            right: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-faint)',
            display: 'flex',
          }}
        >
          {visible ? <RiEyeOffLine size={18} /> : <RiEyeLine size={18} />}
        </button>
      </div>
    </div>
  );
}

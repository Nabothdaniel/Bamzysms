import React from 'react';
import type { IconType } from 'react-icons';

type AuthTextFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  icon: IconType;
  type?: React.HTMLInputTypeAttribute;
  required?: boolean;
  maxLength?: number;
  helperText?: string;
  inputStyle?: React.CSSProperties;
};

export default function AuthTextField({
  label,
  name,
  value,
  onChange,
  placeholder,
  icon: Icon,
  type = 'text',
  required = false,
  maxLength,
  helperText,
  inputStyle,
}: AuthTextFieldProps) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>
        {label}
      </label>
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
          <Icon size={18} />
        </span>
        <input
          name={name}
          type={type}
          className="input-field"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          maxLength={maxLength}
          style={{ paddingLeft: 44, ...inputStyle }}
        />
      </div>
      {helperText ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', marginTop: 8 }}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

import React, { useId } from 'react';
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
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  autoCapitalize?: string;
  spellCheck?: boolean;
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
  autoComplete,
  inputMode,
  autoCapitalize = 'none',
  spellCheck = false,
}: AuthTextFieldProps) {
  const inputId = useId();
  const helperTextId = helperText ? `${inputId}-helper` : undefined;

  return (
    <div>
      <label
        htmlFor={inputId}
        style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}
      >
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
          id={inputId}
          name={name}
          type={type}
          className="input-field"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          maxLength={maxLength}
          autoComplete={autoComplete}
          inputMode={inputMode}
          autoCapitalize={autoCapitalize}
          spellCheck={spellCheck}
          aria-describedby={helperTextId}
          style={{ paddingLeft: 44, ...inputStyle }}
        />
      </div>
      {helperText ? (
        <p
          id={helperTextId}
          style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', marginTop: 8 }}
        >
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

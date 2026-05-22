import { RiSignalTowerFill } from 'react-icons/ri';

export default function AuthBrand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px var(--color-primary-glow)',
        }}
      >
        <RiSignalTowerFill size={20} color="#fff" />
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}>
        bamzy<span style={{ color: 'var(--color-primary)' }}>SMS</span>
      </span>
    </div>
  );
}

export const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--color-bg-dark)' },
  logo: { fontSize: '2.5rem', marginBottom: '1.5rem', color: '#00BFA6', letterSpacing: '-1px' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px', width: '340px', backgroundColor: 'var(--color-surface)', padding: '2.5rem', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', border: '1px solid var(--color-border-dark)' },
  input: { padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--color-border-dark)', fontSize: '1rem', backgroundColor: 'var(--color-bg-dark)', color: 'var(--color-text-main)', outline: 'none' },
  button: { padding: '12px', backgroundColor: '#00BFA6', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '0.5px' },
  error: { color: '#ff4444', fontSize: '0.85rem', textAlign: 'center' },
  link: { textAlign: 'center', fontSize: '0.9rem', color: '#888' }
}
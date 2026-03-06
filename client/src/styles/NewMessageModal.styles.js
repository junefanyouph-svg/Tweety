export const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' },
    modal: { backgroundColor: 'var(--color-surface)', width: '90%', maxWidth: '440px', borderRadius: '20px', border: '1px solid var(--color-border-dark)', display: 'flex', flexDirection: 'column', maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' },
    header: { padding: '16px 20px', borderBottom: '1px solid var(--color-border-dark)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-text-main)' },
    closeBtn: { background: 'none', border: 'none', color: '#888', fontSize: '1.4rem', cursor: 'pointer', padding: '4px' },

    tabs: { display: 'flex', borderBottom: '1px solid var(--color-border-dark)' },
    tab: { flex: 1, padding: '14px', background: 'none', border: 'none', color: '#888', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 'bold', borderBottom: '2px solid transparent', transition: 'all 0.2s' },
    activeTab: { color: '#00BFA6', borderBottom: '2px solid #00BFA6' },

    content: { flex: 1, maxHeight: '400px', overflowY: 'auto', padding: '12px' },
    searchWrapper: { padding: '8px 12px', marginBottom: '12px' },
    searchInput: { width: '100%', backgroundColor: 'var(--color-bg-dark)', border: '1px solid var(--color-border-dark)', borderRadius: '24px', padding: '10px 16px', color: 'var(--color-text-main)', fontSize: '0.9rem', outline: 'none' },

    userList: { display: 'flex', flexDirection: 'column', gap: '8px' },
    userCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s' },
    userCardHover: { backgroundColor: 'var(--color-border-dark)' },
    avatar: { width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#00BFA6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', flexShrink: 0 },
    avatarImg: { width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' },
    userInfo: { flex: 1, overflow: 'hidden' },
    displayName: { fontWeight: 'bold', color: 'var(--color-text-main)', fontSize: '0.95rem', display: 'block' },
    username: { color: 'var(--color-text-dim)', fontSize: '0.85rem' },
    emptyText: { textAlign: 'center', color: 'var(--color-text-dim)', padding: '40px 20px', fontSize: '0.9rem' },
}

export const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        maxWidth: '620px',
        margin: '0 auto',
        width: '100%',
        backgroundColor: 'var(--color-bg-dark)',
        borderLeft: '1px solid var(--color-border-dark)',
        borderRight: '1px solid var(--color-border-dark)',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 10,
        overflow: 'hidden'
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border-dark)',
        backgroundColor: 'var(--color-bg-dark)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        flexShrink: 0
    },
    backBtn: { background: 'none', border: 'none', color: '#00BFA6', fontSize: '1.2rem', cursor: 'pointer', padding: '8px' },
    headerInfo: { display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' },
    headerAvatar: { width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#00BFA6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', color: 'white', flexShrink: 0, overflow: 'hidden' },
    headerAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
    headerText: { display: 'flex', flexDirection: 'column' },
    displayName: { fontWeight: 'bold', color: 'var(--color-text-main)', fontSize: '1rem' },
    username: { color: 'var(--color-text-dim)', fontSize: '0.85rem' },

    messageList: {
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minHeight: 0,
        WebkitOverflowScrolling: 'touch'
    },
    loadingWrapper: {
        marginTop: 'auto',
        marginBottom: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'flex-start'
    },
    loadingBubbleRow: {
        width: '100%',
        display: 'flex',
        justifyContent: 'flex-start'
    },
    loadingBubble: {
        width: '160px',
        height: '20px',
        borderRadius: '16px 16px 16px 4px',
        background: 'linear-gradient(90deg, var(--color-surface) 0%, var(--color-border-dark) 50%, var(--color-surface) 100%)',
        backgroundSize: '200% 100%',
        animation: 'chat-skeleton 1.4s ease-in-out infinite'
    },
    loadingBubbleSmall: {
        width: '110px',
        height: '18px',
        borderRadius: '16px 16px 16px 4px',
        background: 'linear-gradient(90deg, var(--color-surface) 0%, var(--color-border-dark) 50%, var(--color-surface) 100%)',
        backgroundSize: '200% 100%',
        animation: 'chat-skeleton 1.4s ease-in-out infinite'
    },
    loadingBubbleRowRight: {
        width: '100%',
        display: 'flex',
        justifyContent: 'flex-end'
    },
    loadingBubbleRight: {
        width: '160px',
        height: '20px',
        borderRadius: '16px 16px 4px 16px',
        background: 'linear-gradient(90deg, var(--color-surface) 0%, var(--color-border-dark) 50%, var(--color-surface) 100%)',
        backgroundSize: '200% 100%',
        animation: 'chat-skeleton 1.4s ease-in-out infinite'
    },
    loadingBubbleSmallRight: {
        width: '110px',
        height: '18px',
        borderRadius: '16px 16px 4px 16px',
        background: 'linear-gradient(90deg, var(--color-surface) 0%, var(--color-border-dark) 50%, var(--color-surface) 100%)',
        backgroundSize: '200% 100%',
        animation: 'chat-skeleton 1.4s ease-in-out infinite'
    },
    messageWrapper: { display: 'flex', width: '100%', marginBottom: '4px' },
    myMessageWrapper: { justifyContent: 'flex-end' },
    otherMessageWrapper: { justifyContent: 'flex-start' },

    messageContent: { position: 'relative', maxWidth: '75%', padding: '12px 16px', fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
    myMessage: { backgroundColor: '#00BFA6', color: 'white', borderRadius: '18px 18px 4px 18px', paddingRight: '34px' },
    otherMessage: { backgroundColor: 'var(--color-surface)', color: 'var(--color-text-main)', border: '1px solid var(--color-border-dark)', borderRadius: '18px 18px 18px 4px' },
    bubbleMedia: { width: '100%', maxWidth: '300px', borderRadius: '12px', marginTop: '8px', cursor: 'pointer', border: '1px solid var(--color-border-dark)' },
    messageStatus: {
        position: 'absolute',
        right: '10px',
        bottom: '6px',
        fontSize: '0.7rem',
        display: 'flex',
        alignItems: 'center',
        opacity: 0.8
    },
    checkIcon: { color: 'white', fontSize: '11px' },
    loadingIcon: { color: 'white', fontSize: '11px' },
    messageTime: { fontSize: '0.72rem', color: 'var(--color-text-dim)', marginTop: '4px', paddingLeft: '8px', paddingRight: '8px', animation: 'slideDown 0.2s ease' },

    inputArea: {
        padding: '16px',
        borderTop: '1px solid var(--color-border-dark)',
        display: 'flex',
        backgroundColor: 'var(--color-bg-dark)',
        flexShrink: 0,
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))'
    },
    inputContainer: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border-dark)',
        borderRadius: '24px',
        padding: '4px 8px 4px 16px',
        transition: 'border-color 0.2s',
        overflow: 'hidden'
    },
    inputInner: {
        display: 'flex',
        alignItems: 'flex-end',
        width: '100%'
    },
    mediaPreviewWrapper: {
        position: 'relative',
        padding: '12px 12px 0 0',
        display: 'flex',
        alignItems: 'center'
    },
    mediaPreview: {
        maxWidth: '120px',
        maxHeight: '120px',
        borderRadius: '12px',
        objectFit: 'cover',
        border: '1px solid var(--color-border-dark)'
    },
    removeMediaBtn: {
        position: 'absolute',
        top: '4px',
        right: '0',
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '0.8rem'
    },
    input: { flex: 1, backgroundColor: 'transparent', border: 'none', padding: '8px 0', color: 'var(--color-text-main)', fontSize: '0.95rem', outline: 'none', resize: 'none', fontFamily: 'inherit', overflowY: 'auto' },
    sendBtn: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: '#00BFA6',
        color: 'white',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.1s ease',
        flexShrink: 0,
        marginBottom: '2px'
    },
    sendBtnActive: { backgroundColor: '#00a690' },
    dotsBtn: { background: 'none', border: 'none', color: 'var(--color-text-dim)', fontSize: '1.2rem', cursor: 'pointer', padding: '8px', marginLeft: 'auto' },

    // Plus Button & Menu
    plusBtnContainer: { position: 'relative', display: 'flex', alignItems: 'flex-end', marginRight: '12px' },
    plusBtn: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        border: '1px solid var(--color-border-dark)',
        backgroundColor: 'transparent',
        color: '#00BFA6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '1rem',
        transition: 'all 0.2s',
        marginBottom: '4px'
    },
    plusMenu: {
        position: 'absolute',
        bottom: '100%',
        left: '0',
        marginBottom: '12px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border-dark)',
        borderRadius: '16px',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        zIndex: 100,
        minWidth: '140px'
    },
    plusMenuItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        borderRadius: '10px',
        color: 'var(--color-text-main)',
        fontSize: '0.9rem',
        cursor: 'pointer',
        transition: 'background 0.2s',
        whiteSpace: 'nowrap'
    },
    plusMenuItemIcon: { width: '20px', textAlign: 'center', color: '#00BFA6' },

    // Modal Styles
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' },
    modalContent: { backgroundColor: 'var(--color-surface)', width: '90%', maxWidth: '400px', borderRadius: '24px', border: '1px solid var(--color-border-dark)', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' },
    modalHeader: { padding: '16px 20px', borderBottom: '1px solid var(--color-border-dark)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    modalTitle: { fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-text-main)' },
    closeBtn: { background: 'none', border: 'none', color: 'var(--color-text-dim)', fontSize: '1.4rem', cursor: 'pointer' },

    modalProfile: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px', borderBottom: '1px solid var(--color-border-dark)' },
    modalAvatar: { width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#00BFA6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', color: 'white', marginBottom: '16px', overflow: 'hidden', cursor: 'pointer' },
    modalAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
    modalDisplayName: { fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-text-main)', marginBottom: '4px' },
    modalUsername: { fontSize: '0.95rem', color: 'var(--color-text-dim)' },

    modalActions: { padding: '12px' },
    deleteBox: { padding: '16px', borderRadius: '16px', backgroundColor: 'var(--color-bg-dark)', border: '1px solid var(--color-border-dark)', color: 'rgb(244, 31, 45)', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },

    // Modal Actions (Icons)
    modalIconRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', marginTop: '16px' },
    iconButtonWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' },
    iconButtonLabel: { color: 'var(--color-text-main)', fontSize: '0.85rem' },
    mediaRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '66px', height: '66px', borderRadius: '50%', backgroundColor: 'var(--color-bg-dark)', border: '1px solid var(--color-border-dark)', color: 'var(--color-text-main)', cursor: 'pointer', transition: 'background-color 0.2s ease' },
    profileIconBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '66px', height: '66px', borderRadius: '50%', backgroundColor: 'var(--color-bg-dark)', border: '1px solid var(--color-border-dark)', color: 'var(--color-text-main)', cursor: 'pointer', transition: 'background-color 0.2s ease' },
    mediaRowIcon: { fontSize: '1.1rem' },

    // Media modal (replaces conversation info content)
    mediaModalHeader: { padding: '16px 20px', borderBottom: '1px solid var(--color-border-dark)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    mediaModalBackBtn: { background: 'none', border: 'none', color: '#00BFA6', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' },
    mediaEmptyHint: { padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.85rem', gridColumn: '1 / -1' },

    // Tabs / Slider styles
    mediaTabs: { display: 'flex', position: 'relative', backgroundColor: 'var(--color-bg-dark)', borderRadius: '12px', padding: '4px', margin: '0 16px 16px' },
    mediaTab: { flex: 1, padding: '10px', textAlign: 'center', color: 'var(--color-text-dim)', sliderSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', zIndex: 2, transition: 'color 0.3s ease' },
    activeMediaTab: { color: 'var(--color-text-main)' },
    mediaTabIndicator: { position: 'absolute', top: '4px', left: '4px', width: 'calc(50% - 4px)', height: 'calc(100% - 8px)', backgroundColor: 'var(--color-surface)', borderRadius: '10px', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' },
    mediaSliderContainer: { overflow: 'hidden', padding: '0 16px 16px' },
    mediaSlider: { display: 'flex', width: '200%', transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' },
    mediaPanel: { width: '50%' },
    mediaGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
    mediaThumb: { aspectRatio: '1', borderRadius: '12px', objectFit: 'cover', width: '100%', cursor: 'pointer', backgroundColor: 'var(--color-surface)', transition: 'transform 0.2s', border: '1px solid var(--color-border-dark)' },
    mediaThumbVideo: { aspectRatio: '1', borderRadius: '12px', objectFit: 'cover', width: '100%', cursor: 'pointer', backgroundColor: 'var(--color-surface)', transition: 'transform 0.2s', border: '1px solid var(--color-border-dark)' },

    // Confirm Modal Specific
    confirmContent: { padding: '24px' },
    confirmText: { color: '#aaa', fontSize: '0.95rem', marginBottom: '24px', textAlign: 'center', lineHeight: '1.5' },
    confirmActions: { display: 'flex', flexDirection: 'column', gap: '12px' },
    confirmBtn: { padding: '14px', borderRadius: '24px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' },
    confirmDelete: { backgroundColor: '#ff4444', color: 'white' },
    confirmCancel: { backgroundColor: 'transparent', color: 'var(--color-text-main)', border: '1px solid var(--color-border-dark)' },
    emptyState: {
        marginTop: 'auto',
        marginBottom: 'auto',
        textAlign: 'center',
        width: '100%',
        color: '#666',
        fontSize: '0.9rem'
    },
    emptyText: {
        margin: 0
    },

    // Mobile Bottom Sheet Specifics
    '@media (max-width: 768px)': {
        modalOverlay: {
            alignItems: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.8)'
        },
        modalContent: {
            width: '100%',
            maxWidth: '100%',
            height: '85vh',
            borderRadius: '24px 24px 0 0',
            animation: 'slide-up-sheet 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
            borderBottom: 'none'
        },
        mediaSliderContainer: {
            maxHeight: 'calc(85vh - 180px)', // Ensure scrolling works in the sheet
            overflowY: 'auto'
        }
    }
}

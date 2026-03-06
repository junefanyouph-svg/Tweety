export function PostSkeleton() {
  return (
    <div style={skeletonStyles.post}>
      <div style={skeletonStyles.header}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ ...skeletonStyles.box, width: '120px', height: '14px' }}></div>
          <div style={{ ...skeletonStyles.box, width: '80px', height: '12px' }}></div>
        </div>
        <div style={{ ...skeletonStyles.box, width: '60px', height: '12px' }}></div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
        <div style={{ ...skeletonStyles.box, width: '100%', height: '14px' }}></div>
        <div style={{ ...skeletonStyles.box, width: '80%', height: '14px' }}></div>
        <div style={{ ...skeletonStyles.box, width: '60%', height: '14px' }}></div>
      </div>
      <div style={skeletonStyles.actions}>
        <div style={{ ...skeletonStyles.box, width: '50px', height: '14px' }}></div>
        <div style={{ ...skeletonStyles.box, width: '50px', height: '14px' }}></div>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }
        .skeleton-box {
          background: linear-gradient(90deg, var(--color-surface) 25%, var(--color-border-dark) 50%, var(--color-surface) 75%);
          background-size: 600px 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div style={skeletonStyles.profileCard}>
      <div style={{ ...skeletonStyles.avatar }}></div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ ...skeletonStyles.box, width: '150px', height: '18px' }}></div>
        <div style={{ ...skeletonStyles.box, width: '100px', height: '14px' }}></div>
        <div style={{ ...skeletonStyles.box, width: '200px', height: '14px' }}></div>
        <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
          <div style={{ ...skeletonStyles.box, width: '50px', height: '14px' }}></div>
          <div style={{ ...skeletonStyles.box, width: '50px', height: '14px' }}></div>
          <div style={{ ...skeletonStyles.box, width: '50px', height: '14px' }}></div>
        </div>
      </div>
    </div>
  )
}

export function UserCardSkeleton() {
  return (
    <div style={skeletonStyles.userCard}>
      <div style={skeletonStyles.avatar}></div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ ...skeletonStyles.box, width: '120px', height: '14px' }}></div>
        <div style={{ ...skeletonStyles.box, width: '80px', height: '12px' }}></div>
      </div>
    </div>
  )
}

const skeletonStyles = {
  post: { backgroundColor: 'var(--color-surface)', borderRadius: '16px', padding: '20px', border: '1px solid var(--color-border-dark)', marginBottom: '12px' },
  profileCard: { backgroundColor: 'var(--color-surface)', borderRadius: '16px', padding: '24px', margin: '20px 0', border: '1px solid var(--color-border-dark)', display: 'flex', gap: '20px' },
  userCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: 'var(--color-surface)', borderRadius: '16px', border: '1px solid var(--color-border-dark)', marginBottom: '12px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  actions: { display: 'flex', gap: '12px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border-dark)' },
  box: { borderRadius: '6px', background: 'linear-gradient(90deg, var(--color-surface) 25%, var(--color-border-dark) 50%, var(--color-surface) 75%)', backgroundSize: '600px 100%', animation: 'shimmer 1.5s infinite' },
  avatar: { width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(90deg, var(--color-surface) 25%, var(--color-border-dark) 50%, var(--color-surface) 75%)', backgroundSize: '600px 100%', animation: 'shimmer 1.5s infinite', flexShrink: 0 },
}
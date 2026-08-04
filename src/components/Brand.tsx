export function Brand({ size = 26 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect className="bar bar1" x="5"  y="19" width="6" height="9"  rx="2" fill="#FF3D8B" />
        <rect className="bar bar2" x="13" y="10" width="6" height="18" rx="2" fill="#FFB547" />
        <rect className="bar bar3" x="21" y="15" width="6" height="13" rx="2" fill="#46E5D0" />
      </svg>
      <span style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: 17, letterSpacing: '-.01em' }}>
        EventScore
      </span>
      <style>{`
        .bar { transform-origin: 50% 100%; animation: rise .55s cubic-bezier(.2,.8,.2,1) both }
        .bar1 { animation-delay: .04s } .bar2 { animation-delay: .15s } .bar3 { animation-delay: .26s }
        @keyframes rise { from { transform: scaleY(0); opacity: 0 } to { transform: scaleY(1); opacity: 1 } }
      `}</style>
    </span>
  )
}

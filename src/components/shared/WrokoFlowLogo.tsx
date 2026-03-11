export function WrokoFlowLogo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id="wf-bg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C97C5C" />
          <stop offset="100%" stopColor="#B07C4F" />
        </linearGradient>
        <linearGradient id="wf-leaf" x1="16" y1="12" x2="32" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B5C5A3" />
          <stop offset="100%" stopColor="#7B9F6F" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#wf-bg)" />
      <path
        d="M12 16L18 32L24 20L30 32L36 16"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M34 12C34 12 38 14 38 18C38 22 34 24 34 24C34 24 36 20 34 16C33 14 34 12 34 12Z"
        fill="url(#wf-leaf)"
        opacity="0.9"
      />
      <path
        d="M34 12C34 12 30 14 30 18C30 22 34 24 34 24C34 24 32 20 34 16C35 14 34 12 34 12Z"
        fill="url(#wf-leaf)"
        opacity="0.7"
      />
    </svg>
  )
}

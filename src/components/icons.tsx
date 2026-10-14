export const svgProps = {
  viewBox: '0 0 24 24',
  width: '1em',
  height: '1em',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export const UpvoteIcon = () => (
  <svg {...svgProps}>
    <path d="M12 19V5" />
    <path d="M6 11l6-6 6 6" />
  </svg>
)

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

export const ShareIcon = () => (
  <svg {...svgProps}>
    <path d="M12 15V3" />
    <path d="M7.5 7.5 12 3l4.5 4.5" />
    <path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 17.5 11H16" />
  </svg>
)

export const UndoIcon = () => (
  <svg {...svgProps}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
)

export const DownloadIcon = () => (
  <svg {...svgProps}>
    <path d="M12 3v12" />
    <path d="M7.5 10.5 12 15l4.5-4.5" />
    <path d="M5 20h14" />
  </svg>
)

export const GalleryIcon = () => (
  <svg {...svgProps}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 15l5-5 4 4 5-5 4 4" />
  </svg>
)

export const BackIcon = () => (
  <svg {...svgProps}>
    <path d="M15 19 8 12l7-7" />
  </svg>
)

export const UpvoteIcon = () => (
  <svg {...svgProps}>
    <path d="M12 19V5" />
    <path d="M6 11l6-6 6 6" />
  </svg>
)

export const SaveIcon = () => (
  <svg {...svgProps}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
)

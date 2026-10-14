export type Trio = [number, number, number]

const LINES = [0, 1, 2] as const

export interface Face {
  family: string
  fallback: string
  weight: number
  italic: boolean
  upper: boolean
  spacing: string
  size: number
  ink?: string
  glow?: string
}
const F = (
  family: string,
  fallback: string,
  weight: number,
  italic: boolean,
  upper: boolean,
  spacing: string,
  size: number,
  ink?: string,
  glow?: string,
): Face => ({ family, fallback, weight, italic, upper, spacing, size, ink, glow })
const S = 'sans-serif'
const SR = 'serif'
const M = 'monospace'

export const INKS = [
  '#12141a', '#000000', '#2b2d33', '#464a52', '#6a6e77', '#8b8f97',
  '#0047ff', '#e01020', '#00845c', '#7b2ff7', '#ff5c00', '#0098a6', '#c9007a',
]

export const FACES: Face[] = [
  F('Archivo Black', S, 400, false, true, '-0.02em', 0.88),
  F('Bebas Neue', S, 400, false, true, '0.02em', 1.3),
  F('Barlow Condensed', S, 700, false, true, '0.02em', 1.2),
  F('Big Shoulders Display', S, 800, false, true, '0.01em', 1.3),
  F('Space Grotesk', S, 700, false, false, '-0.03em', 1.0),
  F('Manrope', S, 800, false, false, '-0.03em', 1.0),
  F('Sora', S, 700, false, false, '-0.02em', 0.95),
  F('Righteous', S, 400, false, false, '0', 1.0),
  F('Bungee', S, 400, false, true, '0', 0.82),
  F('IBM Plex Mono', M, 500, true, false, '0', 0.88),
  F('Space Mono', M, 700, false, false, '-0.02em', 0.88),
  F('VT323', M, 400, false, false, '0.01em', 1.24),
  F('DM Serif Display', SR, 400, false, false, '0', 1.12),
  F('Instrument Serif', SR, 400, true, false, '0', 1.18),
  F('Silkscreen', S, 700, false, true, '0.04em', 0.88, '#ff45a8'),
  F('Audiowide', S, 400, false, false, '0', 0.88, '#e5177f', '0 0 5px rgba(229,23,127,0.18)'),
  F('Wallpoet', S, 400, false, true, '0.02em', 0.94, '#ff2d95'),
  F('Comic Neue', S, 700, true, false, '0', 1.05, '#ff2d95'),
  F('Bungee Inline', S, 400, false, true, '0', 0.82, '#00b8d4'),
  F('Turret Road', S, 800, false, true, '0.01em', 0.88, '#e07b00', '0 0 12px rgba(224,123,0,0.45)'),
  F('Kanit', S, 800, true, true, '-0.01em', 0.94, '#e04e00'),
  F('Bodoni Moda', SR, 900, false, false, '-0.01em', 1.18),
  F('Playfair Display', SR, 900, false, false, '-0.015em', 1.12),
  F('Prata', SR, 400, false, false, '0', 1.0),
  F('Bricolage Grotesque', S, 800, false, false, '-0.03em', 1.0),
  F('Libre Franklin', S, 900, false, true, '-0.01em', 0.88),
  F('Epilogue', S, 800, true, false, '-0.03em', 1.0),
  F('Newsreader', SR, 600, true, false, '0', 1.12),
]

const pick = (n: number) => Math.floor(Math.random() * n)

export const colorOf = (face: number, ink: number) => FACES[face].ink ?? INKS[ink]

export function restyle(faces: Trio, inks: Trio, indices: number[]): { faces: Trio; inks: Trio } {
  const f = [...faces] as Trio
  const c = [...inks] as Trio
  for (const i of indices) {
    const others = LINES.filter((j) => j !== i)
    const taken = () => others.map((j) => colorOf(f[j], c[j]))
    let face = pick(FACES.length)
    for (let t = 0; t < 40; t++) {
      const fixed = FACES[face].ink
      const clash =
        others.some((j) => FACES[f[j]].family === FACES[face].family) ||
        (fixed !== undefined && taken().includes(fixed))
      if (!clash) break
      face = pick(FACES.length)
    }
    let ink = pick(INKS.length)
    for (let t = 0; t < 20 && taken().includes(INKS[ink]); t++) ink = pick(INKS.length)
    f[i] = face
    c[i] = ink
  }
  return { faces: f, inks: c }
}

export const formatStyleParam = (st: { faces: Trio; inks: Trio }) =>
  LINES.map((i) => `${st.faces[i]}.${st.inks[i]}`).join(',')

export function parseStyleParam(value: string | null): { faces: Trio; inks: Trio } | null {
  const parts = value?.split(',')
  if (parts?.length !== 3) return null
  const faces: number[] = []
  const inks: number[] = []
  for (const part of parts) {
    const m = /^(\d+)\.(\d+)$/.exec(part)
    if (!m || +m[1] >= FACES.length || +m[2] >= INKS.length) return null
    faces.push(+m[1])
    inks.push(+m[2])
  }
  return { faces: faces as Trio, inks: inks as Trio }
}

export interface LineCssInput {
  faces: Trio
  inks: Trio
}

const BASE_SIZE = ['4.8cqw', '4.2cqw', '4.8cqw']

export function lineCss(style: LineCssInput, i: number): React.CSSProperties {
  const face = FACES[style.faces[i]]
  return {
    fontFamily: `'${face.family}', ${face.fallback}`,
    fontWeight: face.weight,
    fontStyle: face.italic ? 'italic' : 'normal',
    fontSize: `calc(${BASE_SIZE[i]} * ${face.size})`,
    letterSpacing: face.spacing,
    textTransform: face.upper ? 'uppercase' : 'none',
    color: colorOf(style.faces[i], style.inks[i]),
    textShadow: face.glow ?? 'none',
  }
}

/** Like lineCss but sized in px, for text outside the billboard (editor rows, gallery cards). */
export function plainCss(style: LineCssInput, i: number, basePx: number): React.CSSProperties {
  return { ...lineCss(style, i), fontSize: `calc(${basePx}px * ${FACES[style.faces[i]].size})` }
}

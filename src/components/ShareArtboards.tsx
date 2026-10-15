import billboard from '../assets/billboard.png'
import dayBillboard from '../assets/day-billboard.jpg'
import nightBillboard from '../assets/night-billboard.jpg'
import sutroBlank from '../assets/sutro-blank.jpeg'
import type { Haiku } from '../lib/haiku'
import { PAPER_H, PAPER_W, QUADS, SHARE_H, SHARE_W, quadMatrix } from '../lib/shareImage'
import { FACES, type Style, lineCss } from '../lib/style'

const BASE = [1, 0.875, 1]
const lineStyle = (style: Style, i: number): React.CSSProperties => ({
    ...lineCss(style, i),
    fontSize: `${BASE[i] * FACES[style.faces[i]].size}em`,
    whiteSpace: 'nowrap',
    display: 'block',
    transformOrigin: 'center',
    lineHeight: 1.2,
    opacity: 0.92,
    mixBlendMode: 'multiply',
})

const boxStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    padding: '20px 40px',
    textAlign: 'center',
}

const captionStyle: React.CSSProperties = {
    position: 'absolute',
    right: 30,
    bottom: 26,
    fontFamily: "'Open Sans', sans-serif",
    fontStyle: 'italic',
    fontWeight: 400,
    fontSize: 30,
    color: '#fff',
    textShadow: '0 0 5px rgba(0,0,0,0.6)',
}

const artboardStyle = (background: string): React.CSSProperties => ({
    position: 'relative',
    width: SHARE_W,
    height: SHARE_H,
    overflow: 'hidden',
    background,
})

const photoStyle = (top: number, height: number, width: number, left = 0): React.CSSProperties => ({
    position: 'absolute',
    left,
    top,
    width,
    height,
    maxWidth: 'none',
})

export function Artboards({ haiku, style }: { haiku: Haiku; style: Style }) {
    const box = (
        <div data-box="" style={boxStyle}>
            {[0, 1, 2].map((i) => (
                <span key={i} data-line="" style={lineStyle(style, i)}>
                    {haiku[i].text}
                </span>
            ))}
        </div>
    )
    const paper = (kind: 'day' | 'night') => (
        <div
            data-board={kind}
            data-quad={QUADS[kind].join(',')}
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: PAPER_W,
                height: PAPER_H,
                transformOrigin: '0 0',
                transform: quadMatrix(PAPER_W, PAPER_H, QUADS[kind]),
                fontSize: 46,
            }}
        >
            {box}
        </div>
    )
    const caption = (
        <div data-k="caption" style={captionStyle}>
            haiku.guru
        </div>
    )
    return (
        <div aria-hidden="true" style={{ position: 'fixed', left: -99999, top: 0 }}>
            <div
                data-artboard="1a"
                style={{
                    ...artboardStyle('#faf9f5'),
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 44,
                    padding: 48,
                }}
            >
                <div data-k="photo" style={{ position: 'relative', width: 984, height: 655, borderRadius: 12, overflow: 'hidden', background: '#0d1116' }}>
                    <img src={billboard} alt="" style={{ display: 'block', width: '100%', height: '100%' }} />
                    <div
                        data-board="none"
                        style={{ position: 'absolute', left: '9.3%', top: '4.6%', width: '85.9%', height: '37.1%', transform: 'rotate(-0.28deg)', fontSize: 42 }}
                    >
                        {box}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div data-k="text" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: 24, color: 'rgba(20,19,14,0.6)' }}>
                        Write your own 5-7-5 at
                    </div>
                    <div data-k="text" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: 34, color: '#b5730a' }}>
                        haiku.guru
                    </div>
                </div>
            </div>

            <div data-artboard="1b" style={artboardStyle('#8aa2bb')}>
                <img src={sutroBlank} alt="" style={photoStyle(0, 1350, 2024, -267)} />
                <div data-board="sutro" style={{ position: 'absolute', left: 66, top: 620, width: 948, height: 317, fontSize: 44 }}>
                    {box}
                </div>
                {caption}
            </div>

            <div data-artboard="1c" style={artboardStyle('#c3d3e6')}>
                <img src={dayBillboard} alt="" style={photoStyle(-111, 1512, 1080)} />
                {paper('day')}
                {caption}
            </div>

            <div data-artboard="1d" style={artboardStyle('#0b0606')}>
                <img src={nightBillboard} alt="" style={photoStyle(-45, 1440, 1080)} />
                {paper('night')}
                {caption}
            </div>
        </div>
    )
}

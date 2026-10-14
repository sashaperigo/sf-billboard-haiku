import { useMediaQuery } from '../lib/useMediaQuery'

const STEPS = [
  {
    title: 'Roll',
    desc: 'Each line is a real phrase from an AI billboard. Roll to shuffle them into a 5-7-5 haiku.',
    short: 'to shuffle real billboard phrases into a 5-7-5 haiku.',
  },
  {
    title: 'Tune',
    desc: 'Lock the lines you like and roll the rest. Restyle any line with a new typeface.',
    short: 'by locking lines you like and changing fonts.',
  },
  {
    title: 'Save',
    desc: 'Post it to the public gallery so others can upvote it, or share a link or image.',
    short: 'it to the public gallery, or share a link or image.',
  },
]

export function Steps() {
  const isMobile = useMediaQuery('(max-width: 700px)')
  return (
    <ol className="steps">
      {STEPS.map((s, i) => (
        <li key={s.title} className="step">
          <span className="step-num" data-step={i + 1} aria-hidden="true">
            {i + 1}
          </span>
          {isMobile ? (
            <p>
              <strong>{s.title}</strong> {s.short}
            </p>
          ) : (
            <div>
              <strong>{s.title}</strong>
              <p>{s.desc}</p>
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}

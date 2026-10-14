export const STEPS = [
  {
    title: 'Roll',
    desc: 'Each line is a real phrase from an AI billboard. Roll to shuffle them into a 5-7-5 haiku.',
  },
  {
    title: 'Tune',
    desc: 'Lock the lines you like and roll the rest. Restyle any line with a new typeface.',
  },
  {
    title: 'Save',
    desc: 'Post it to the gallery for upvotes, or download it as a billboard photo to share.',
  },
]

/** Inline steps for desktop; hidden by CSS on mobile, where HelpPanel takes over. */
export function Steps() {
  return (
    <ol className="steps">
      {STEPS.map((s, i) => (
        <li key={s.title} className="step">
          <span className="step-num" data-step={i + 1} aria-hidden="true">
            {i + 1}
          </span>
          <div>
            <strong>{s.title}</strong>
            <p>{s.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

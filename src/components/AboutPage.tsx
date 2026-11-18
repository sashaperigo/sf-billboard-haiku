export function AboutPage() {
  return (
    <main className="about-page">
      <h1>About</h1>
      <p>
        All phrases included in these haikus come from real AI billboards in the Bay Area. Some I jotted down in my
        notes app as I walked around San Francisco, while others were sourced from Dan Berte’s archive of billboards
        on Silicon Valley’s Route 101,{' '}
        <a href="https://101ads.org/" target="_blank" rel="noreferrer">
          101ads.org
        </a>
        .
      </p>
      <p>Thank you Brady Hirsch, who had the idea for this app in the first place.</p>
      <p>
        Vibe coded by{' '}
        <a href="https://www.linkedin.com/in/sashaperigo/" target="_blank" rel="noreferrer">
          Sasha Perigo
        </a>{' '}
        in San Francisco.
      </p>
      <p>To submit a billboard or send me feedback, you can reach me at sasha dot perigo at gmail dot com.</p>
    </main>
  )
}

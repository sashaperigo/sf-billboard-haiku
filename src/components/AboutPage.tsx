const NYT = 'https://www.nytimes.com/2025/08/04/business/tech-billboards-are-all-over-san-francisco-can-you-decode-them.html'

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
        in San Francisco. You can reach me at sasha dot perigo at gmail dot com.
      </p>
      <p className="about-credits">
        <strong>Photo credits:</strong>{' '}
        <a
          href="https://www.kqed.org/news/12076608/what-do-san-franciscos-ai-vs-humans-billboards-say-about-our-working-futures"
          target="_blank"
          rel="noreferrer"
        >
          Gustavo Hernandez/KQED
        </a>
        ,{' '}
        <a href={NYT} target="_blank" rel="noreferrer">
          Ian C. Bates/The New York Times
        </a>
        ,{' '}
        <a href={NYT} target="_blank" rel="noreferrer">
          Mike Isaac/The New York Times
        </a>
      </p>
    </main>
  )
}

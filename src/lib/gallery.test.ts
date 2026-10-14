import type { Phrase } from './haiku'
import { createGalleryApi } from './gallery'

const mk = (n: 5 | 7, count: number, prefix: string): Phrase[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i + 1}`,
    text: `${prefix} text ${i + 1}`,
    syllables: n,
  }))
const allPhrases = [...mk(5, 3, 'f'), ...mk(7, 2, 's')]

const row = (overrides: Partial<{ id: string; haiku_param: string; style_param: string; upvotes: number }>) => ({
  id: 'row-1',
  created_at: '2026-01-01T00:00:00Z',
  haiku_param: 'f1,s1,f2',
  style_param: '0.0,1.1,2.2',
  upvotes: 0,
  ...overrides,
})

function fakeClient(opts: {
  selectResult?: { data: unknown[] | null; error: unknown; count?: number | null }
  insertResult?: { data?: unknown; error: unknown }
  rpcResult?: { data: unknown; error: unknown }
}) {
  const calls: { method: string; args: unknown[] }[] = []
  // Chainable + thenable, like a PostgREST builder: records every call, resolves to the configured result.
  const builder: any = new Proxy(
    {},
    {
      get(_t, method: string) {
        if (method === 'then') {
          const result = calls.some((c) => c.method === 'insert')
            ? (opts.insertResult ?? { data: { id: 'new-id' }, error: null })
            : (opts.selectResult ?? { data: [], error: null })
          return (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej)
        }
        return (...args: unknown[]) => {
          calls.push({ method, args })
          return builder
        }
      },
    },
  )
  const from = vi.fn(() => builder)
  const rpc = vi.fn(() => Promise.resolve(opts.rpcResult ?? { data: null, error: null }))
  return { from, rpc, calls } as any
}

describe('fetchGalleryPage', () => {
  it('parses rows into gallery haikus and reports hasMore for a full page', async () => {
    const data = Array.from({ length: 24 }, (_, i) => row({ id: `row-${i}`, upvotes: i }))
    const client = fakeClient({ selectResult: { data, error: null } })
    const api = createGalleryApi(client)

    const { items, hasMore } = await api.fetchGalleryPage(allPhrases, 0)

    expect(items).toHaveLength(24)
    expect(items[0].id).toBe('row-0')
    expect(items[0].haiku.map((p) => p.id)).toEqual(['f1', 's1', 'f2'])
    expect(items[0].style).toEqual({ faces: [0, 1, 2], inks: [0, 1, 2] })
    expect(items[0].upvotes).toBe(0)
    expect(hasMore).toBe(true)
  })

  it('reports hasMore false for a partial page', async () => {
    const client = fakeClient({ selectResult: { data: [row({})], error: null } })
    const api = createGalleryApi(client)

    const { hasMore } = await api.fetchGalleryPage(allPhrases, 0)

    expect(hasMore).toBe(false)
  })

  it('drops rows that fail to parse without throwing', async () => {
    const data = [row({ id: 'good' }), row({ id: 'bad', haiku_param: 'nope' })]
    const client = fakeClient({ selectResult: { data, error: null } })
    const api = createGalleryApi(client)

    const { items } = await api.fetchGalleryPage(allPhrases, 0)

    expect(items.map((i) => i.id)).toEqual(['good'])
  })

  it('throws when the select errors', async () => {
    const client = fakeClient({ selectResult: { data: null, error: new Error('boom') } })
    const api = createGalleryApi(client)

    await expect(api.fetchGalleryPage(allPhrases, 0)).rejects.toThrow()
  })

  const orders = (client: any) =>
    client.calls.filter((c: any) => c.method === 'order').map((c: any) => [c.args[0], c.args[1].ascending])

  it('sorts by upvotes then recency by default (top)', async () => {
    const client = fakeClient({})
    await createGalleryApi(client).fetchGalleryPage(allPhrases, 0)
    expect(orders(client)).toEqual([['upvotes', false], ['created_at', false]])
  })

  it('sorts by recency only for new', async () => {
    const client = fakeClient({})
    await createGalleryApi(client).fetchGalleryPage(allPhrases, 0, { sort: 'new' })
    expect(orders(client)).toEqual([['created_at', false]])
  })

  it('honours a custom limit for the range and hasMore', async () => {
    const data = [row({ id: 'a' }), row({ id: 'b' }), row({ id: 'c' })]
    const client = fakeClient({ selectResult: { data, error: null } })
    const { hasMore } = await createGalleryApi(client).fetchGalleryPage(allPhrases, 0, { limit: 3 })
    expect(client.calls.find((c: any) => c.method === 'range').args).toEqual([0, 2])
    expect(hasMore).toBe(true)
  })
})

describe('countHaikus', () => {
  it('does a head-only exact count', async () => {
    const client = fakeClient({ selectResult: { data: null, error: null, count: 312 } })
    const count = await createGalleryApi(client).countHaikus()
    expect(count).toBe(312)
    expect(client.calls[0]).toEqual({ method: 'select', args: ['*', { count: 'exact', head: true }] })
  })

  it('throws when the count errors', async () => {
    const client = fakeClient({ selectResult: { data: null, error: new Error('boom'), count: null } })
    await expect(createGalleryApi(client).countHaikus()).rejects.toThrow()
  })
})

describe('saveHaikuToGallery', () => {
  it('inserts the formatted haiku and style params', async () => {
    const client = fakeClient({})
    const api = createGalleryApi(client)
    const haiku = [allPhrases[0], allPhrases[3], allPhrases[1]] as [Phrase, Phrase, Phrase]

    await api.saveHaikuToGallery(haiku, { faces: [0, 1, 2], inks: [3, 4, 5] })

    const insertCall = client.calls.find((c: any) => c.method === 'insert').args[0]
    expect(insertCall).toEqual({ haiku_param: 'f1,s1,f2', style_param: '0.3,1.4,2.5' })
  })

  it('returns the id of the new row', async () => {
    const client = fakeClient({ insertResult: { data: { id: 'new-id' }, error: null } })
    const api = createGalleryApi(client)
    const haiku = [allPhrases[0], allPhrases[3], allPhrases[1]] as [Phrase, Phrase, Phrase]

    await expect(api.saveHaikuToGallery(haiku, { faces: [0, 1, 2], inks: [3, 4, 5] })).resolves.toBe('new-id')
  })

  it('throws when the insert errors', async () => {
    const client = fakeClient({ insertResult: { error: new Error('boom') } })
    const api = createGalleryApi(client)
    const haiku = [allPhrases[0], allPhrases[3], allPhrases[1]] as [Phrase, Phrase, Phrase]

    await expect(api.saveHaikuToGallery(haiku, { faces: [0, 1, 2], inks: [3, 4, 5] })).rejects.toThrow()
  })
})

describe('upvoteHaiku', () => {
  it('calls the increment_upvote rpc and returns the new count', async () => {
    const client = fakeClient({ rpcResult: { data: { upvotes: 7 }, error: null } })
    const api = createGalleryApi(client)

    const count = await api.upvoteHaiku('row-1')

    expect(client.rpc).toHaveBeenCalledWith('increment_upvote', { haiku_id: 'row-1' })
    expect(count).toBe(7)
  })

  it('throws when the rpc errors', async () => {
    const client = fakeClient({ rpcResult: { data: null, error: new Error('boom') } })
    const api = createGalleryApi(client)

    await expect(api.upvoteHaiku('row-1')).rejects.toThrow()
  })
})

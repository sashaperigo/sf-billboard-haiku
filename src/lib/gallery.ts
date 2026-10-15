import type { SupabaseClient } from '@supabase/supabase-js'
import { type Haiku, type Phrase, formatShareParam, parseShareParam } from './haiku'
import { type Style, formatStyleParam, parseStyleParam } from './style'
import { DEFAULT_CREATOR, MAX_CREATOR_LENGTH } from './creator'
import { supabase } from './supabaseClient'

export interface GalleryHaiku {
  id: string
  haiku: Haiku
  style: Style
  upvotes: number
  creator: string
}

const PAGE_SIZE = 24

export type GallerySort = 'top' | 'new'

export interface FetchOptions {
  sort?: GallerySort
  limit?: number
}

interface HaikuRow {
  id: string
  haiku_param: string
  style_param: string
  upvotes: number
  creator_name: string | null
}

function parseRow(allPhrases: Phrase[], row: HaikuRow): GalleryHaiku | null {
  const haiku = parseShareParam(allPhrases, row.haiku_param)
  const style = parseStyleParam(row.style_param)
  if (!haiku || !style) return null
  return { id: row.id, haiku, style, upvotes: row.upvotes, creator: row.creator_name || DEFAULT_CREATOR }
}

export function createGalleryApi(client: SupabaseClient) {
  async function fetchGalleryPage(
    allPhrases: Phrase[],
    offset: number,
    { sort = 'top', limit = PAGE_SIZE }: FetchOptions = {},
  ): Promise<{ items: GalleryHaiku[]; hasMore: boolean }> {
    let query = client.from('haikus').select('*')
    if (sort === 'top') query = query.order('upvotes', { ascending: false })
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    const rows = (data ?? []) as HaikuRow[]
    const items = rows
      .map((row) => parseRow(allPhrases, row))
      .filter((item): item is GalleryHaiku => item !== null)
    return { items, hasMore: rows.length === limit }
  }

  async function countHaikus(): Promise<number> {
    const { count, error } = await client.from('haikus').select('*', { count: 'exact', head: true })
    if (error) throw error
    return count ?? 0
  }

  async function saveHaikuToGallery(haiku: Haiku, style: Style, creator: string): Promise<string> {
    const { data, error } = await client
      .from('haikus')
      .insert({
        haiku_param: formatShareParam(haiku),
        style_param: formatStyleParam(style),
        creator_name: creator.trim().slice(0, MAX_CREATOR_LENGTH) || DEFAULT_CREATOR,
      })
      .select('id')
      .single()
    if (error) throw error
    return (data as { id: string }).id
  }

  async function upvoteHaiku(id: string): Promise<number> {
    const { data, error } = await client.rpc('increment_upvote', { haiku_id: id })
    if (error) throw error
    return (data as { upvotes: number }).upvotes
  }

  async function removeUpvote(id: string): Promise<number> {
    const { data, error } = await client.rpc('decrement_upvote', { haiku_id: id })
    if (error) throw error
    return (data as { upvotes: number }).upvotes
  }

  return { fetchGalleryPage, countHaikus, saveHaikuToGallery, upvoteHaiku, removeUpvote }
}

type GalleryApi = ReturnType<typeof createGalleryApi>

function requireClient(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured (missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY)')
  return supabase
}

const api = () => createGalleryApi(requireClient())

export const fetchGalleryPage = (...args: Parameters<GalleryApi['fetchGalleryPage']>) => api().fetchGalleryPage(...args)
export const countHaikus = () => api().countHaikus()
export const saveHaikuToGallery = (...args: Parameters<GalleryApi['saveHaikuToGallery']>) => api().saveHaikuToGallery(...args)
export const upvoteHaiku = (id: string) => api().upvoteHaiku(id)
export const removeUpvote = (id: string) => api().removeUpvote(id)

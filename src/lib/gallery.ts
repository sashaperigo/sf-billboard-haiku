import type { SupabaseClient } from '@supabase/supabase-js'
import { type Haiku, type Phrase, formatShareParam, parseShareParam } from './haiku'
import { type Trio, formatStyleParam, parseStyleParam } from './style'
import { supabase } from './supabaseClient'

export interface GalleryStyle {
  faces: Trio
  inks: Trio
}

export interface GalleryHaiku {
  id: string
  haiku: Haiku
  style: GalleryStyle
  upvotes: number
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
}

function parseRow(allPhrases: Phrase[], row: HaikuRow): GalleryHaiku | null {
  const haiku = parseShareParam(allPhrases, row.haiku_param)
  const style = parseStyleParam(row.style_param)
  if (!haiku || !style) return null
  return { id: row.id, haiku, style, upvotes: row.upvotes }
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

  async function saveHaikuToGallery(haiku: Haiku, style: GalleryStyle): Promise<string> {
    const { data, error } = await client
      .from('haikus')
      .insert({
        haiku_param: formatShareParam(haiku),
        style_param: formatStyleParam(style),
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

function requireClient(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured (missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY)')
  return supabase
}

export const fetchGalleryPage: ReturnType<typeof createGalleryApi>['fetchGalleryPage'] = (...args) =>
  createGalleryApi(requireClient()).fetchGalleryPage(...args)
export const countHaikus: ReturnType<typeof createGalleryApi>['countHaikus'] = (...args) =>
  createGalleryApi(requireClient()).countHaikus(...args)
export const saveHaikuToGallery: ReturnType<typeof createGalleryApi>['saveHaikuToGallery'] = (...args) =>
  createGalleryApi(requireClient()).saveHaikuToGallery(...args)
export const upvoteHaiku: ReturnType<typeof createGalleryApi>['upvoteHaiku'] = (...args) =>
  createGalleryApi(requireClient()).upvoteHaiku(...args)
export const removeUpvote: ReturnType<typeof createGalleryApi>['removeUpvote'] = (...args) =>
  createGalleryApi(requireClient()).removeUpvote(...args)

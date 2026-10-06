import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const supabase: SupabaseClient<Database> | null =
  supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      })
    : null

export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }

  return supabase
}

type Page<T> = { data: T[] | null; error: unknown; count: number | null }

const PAGE_SIZE = 1000

/** Reads a query page by page: a successful PostgREST response can still be capped by the project's max_rows. */
export async function allRows<T>(fetchPage: (from: number, to: number) => PromiseLike<Page<T>>): Promise<T[]> {
  const result: T[] = []
  while (true) {
    const { data, error, count } = await fetchPage(result.length, result.length + PAGE_SIZE - 1)
    if (error) throw error
    if (count === null) throw new Error('Query did not return a row count.')
    result.push(...(data ?? []))
    if (result.length >= count) return result
    if (!data?.length) throw new Error('Query returned incomplete data.')
  }
}

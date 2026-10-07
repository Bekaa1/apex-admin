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

/**
 * Uploads a file to a Storage bucket and reports progress (0–1). supabase-js has no upload progress,
 * so this goes to the Storage REST API through XMLHttpRequest with the signed-in user's token.
 */
export async function uploadToStorage(bucket: string, path: string, file: Blob, onProgress: (fraction: number) => void, signal: AbortSignal): Promise<string> {
  const sb = requireSupabase()
  const { data, error } = await sb.auth.getSession()
  const token = data.session?.access_token
  if (error || !token || !supabaseUrl || !supabaseAnonKey) throw new Error('Authentication required.')
  signal.throwIfAborted()
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/${bucket}/${path}`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('apikey', supabaseAnonKey)
    xhr.setRequestHeader('x-upsert', 'false')
    if (file.type) xhr.setRequestHeader('Content-Type', file.type)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total)
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed with status ${xhr.status}.`)))
    xhr.onerror = () => reject(new Error('Upload failed: network error.'))
    xhr.onabort = () => reject(new DOMException('Upload cancelled.', 'AbortError'))
    signal.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(file)
  })
  return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl
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

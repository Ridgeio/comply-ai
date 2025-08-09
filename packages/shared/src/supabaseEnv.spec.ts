import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { checkSupabaseEnv } from './supabaseEnv'

describe('checkSupabaseEnv', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    // Restore original env
    process.env = originalEnv
  })

  it('should throw when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

    expect(() => checkSupabaseEnv()).toThrow(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL'
    )
  })

  it('should throw when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    expect(() => checkSupabaseEnv()).toThrow(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  })

  it('should throw when both environment variables are missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    expect(() => checkSupabaseEnv()).toThrow(/Missing required environment variable/)
  })

  it('should return environment config when all variables are present', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    const result = checkSupabaseEnv()
    
    expect(result).toEqual({
      url: 'http://localhost:54321',
      anonKey: 'test-anon-key'
    })
  })

  it('should trim whitespace from environment variables', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '  http://localhost:54321  '
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '  test-anon-key  '

    const result = checkSupabaseEnv()
    
    expect(result).toEqual({
      url: 'http://localhost:54321',
      anonKey: 'test-anon-key'
    })
  })
})
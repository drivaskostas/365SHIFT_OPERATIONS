
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oyhgsgieeylrzcjfaykd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95aGdzZ2llZXlscnpjamZheWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MTY5MDYsImV4cCI6MjA3NDI5MjkwNn0.xGzBtnUFAFBBHWRIrb5DxYg_KaM2iHBITT8PvJH4xvs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
})

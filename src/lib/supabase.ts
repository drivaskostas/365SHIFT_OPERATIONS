
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://igcqqrcdtqpecopvuuva.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnY3FxcmNkdHFwZWNvcHZ1dXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0OTI5MzAsImV4cCI6MjA1NjA2ODkzMH0.w5Ac9bpsfXpkAa4FJi2pDlMzpM6j1pEe3bL36fpzuQE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
})

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)
      
      // Update session and user state
      setSession(session)
      setUser(session?.user ?? null)
      
      // Handle profile fetching based on session
      if (session?.user && event !== 'SIGNED_OUT') {
        // Defer profile fetching to avoid potential deadlocks
        setTimeout(() => {
          fetchProfile(session.user.id)
        }, 0)
      } else {
        setProfile(null)
        setLoading(false)
        
        // Stop location tracking when user signs out
        if (event === 'SIGNED_OUT') {
          setSigningOut(false) // Reset signing out state
          // Dynamic import to avoid circular dependencies
          import('@/services/LocationTrackingService').then(({ LocationTrackingService }) => {
            LocationTrackingService.stopTracking();
          });
        }
      }
    })

    // THEN check for existing session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
          setLoading(false)
          return
        }
        
        console.log('Initial session check:', session?.user?.id)
        
        if (session) {
          setSession(session)
          setUser(session.user)
          await fetchProfile(session.user.id)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('Session retrieval error:', error)
        setLoading(false)
      }
    }
    
    getInitialSession()
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Profile fetch exception:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signOut = async () => {
    // Prevent multiple signout attempts
    if (signingOut) {
      console.log('Sign out already in progress, skipping...')
      return
    }

    try {
      setSigningOut(true)
      console.log('Signing out user...')
      
      // Always try to sign out, but don't throw errors if session is already invalid
      const { error } = await supabase.auth.signOut()
      
      // Only log session-related errors, don't throw them
      if (error) {
        console.log('Supabase signout response:', error.message)
        // Don't throw error for session-related issues
        if (!error.message.includes('Session not found') && 
            !error.message.includes('session id') && 
            !error.message.includes("doesn't exist") &&
            !error.message.includes('Auth session missing')) {
          throw error
        }
      }
      
      // Always clear local state regardless of Supabase response
      setUser(null)
      setProfile(null)
      setSession(null)
      setLoading(false)
      
      // Clear all shift-related data from localStorage
      localStorage.removeItem('guardShiftInfo')
      localStorage.removeItem('persistentPatrolData')
      localStorage.removeItem('currentPatrolId')
      
      console.log('User signed out successfully')
    } catch (error) {
      console.error('Sign out error:', error)
      // For any remaining errors, just clear state and don't re-throw
      setUser(null)
      setProfile(null)
      setSession(null)
      setLoading(false)
      
      // Clear all shift-related data even on error
      localStorage.removeItem('guardShiftInfo')
      localStorage.removeItem('persistentPatrolData')
      localStorage.removeItem('currentPatrolId')
    } finally {
      setSigningOut(false)
    }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

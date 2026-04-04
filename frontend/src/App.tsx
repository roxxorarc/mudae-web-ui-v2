import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import './App.css'

function App() {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithDiscord = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
    })
    if (error) console.error("Error logging in:", error.message)
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error("Error signing out:", error.message)
  }

  return (
    <div className="App">
      <header className="header">
        <h1>Mudae Web UI</h1>
        {session ? (
          <div className="user-profile">
            <span>Welcome, {session.user.user_metadata?.full_name || session.user.email}</span>
            <button onClick={signOut}>Sign Out</button>
          </div>
        ) : (
          <button onClick={signInWithDiscord} className="discord-btn">Login with Discord</button>
        )}
      </header>
    </div>
  )
}

export default App

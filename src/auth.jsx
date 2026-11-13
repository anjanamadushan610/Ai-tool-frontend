import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setUnauthorizedHandler } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // undefined = still checking, null = signed out, object = signed in
  const [me, setMe] = useState(undefined)

  const refresh = useCallback(async () => {
    try {
      setMe(await api('/auth/me'))
    } catch {
      setMe(null)
    }
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => setMe(null))
    refresh()
  }, [refresh])

  const login = useCallback(async (username, password, remember) => {
    setMe(await api('/auth/login', { method: 'POST', body: { username, password, remember } }))
  }, [])

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } finally {
      setMe(null)
    }
  }, [])

  const value = useMemo(() => {
    const perms = new Set(me?.permissions || [])
    return { me, refresh, login, logout, can: (p) => perms.has(p) }
  }, [me, refresh, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

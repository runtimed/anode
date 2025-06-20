import React from 'react'
import { AuthWrapper } from './components/auth/AuthWrapper.js'
import { LiveStoreApp } from './components/LiveStoreApp.js'

export const App: React.FC = () => {
  return (
    <AuthWrapper>
      {(authToken) => <LiveStoreApp authToken={authToken} />}
    </AuthWrapper>
  )
}

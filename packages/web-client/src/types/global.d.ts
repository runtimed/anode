// Global type declarations for Google API

declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void
      auth2: {
        init: (config: {
          client_id: string
          scope: string
        }) => Promise<any>
        getAuthInstance: () => {
          isSignedIn: {
            get: () => boolean
          }
          currentUser: {
            get: () => {
              getBasicProfile: () => {
                getId: () => string
                getEmail: () => string
                getName: () => string
                getImageUrl: () => string
              }
              getAuthResponse: () => {
                id_token: string
              }
              reloadAuthResponse: () => Promise<{
                id_token: string
              }>
            }
          }
          signIn: () => Promise<any>
          signOut: () => Promise<void>
        }
      }
    }
  }
}

export {}

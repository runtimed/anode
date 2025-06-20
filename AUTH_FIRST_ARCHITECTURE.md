# Auth-First Architecture

## Overview

This document describes the new auth-first architecture implemented to solve authentication sync issues in Anode. The architecture ensures that LiveStore is only initialized after a valid authentication token is obtained, preventing sync failures and improving user experience.

## Problem Statement

The previous architecture had several critical issues:

1. **LiveStore Initialization Race Condition**: LiveStore would initialize with whatever token existed at startup, regardless of validity
2. **Token Refresh Invisibility**: When Google OAuth tokens refreshed, LiveStore couldn't update its sync payload
3. **Silent Sync Failures**: Users couldn't tell when authentication failed, leading to invisible sync issues
4. **State Corruption**: Failed auth attempts would cause LiveStore state desynchronization
5. **Poor Error Recovery**: Users had to manually refresh pages to recover from auth failures

## Solution: Auth-First Architecture

### Architecture Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AuthWrapper   │ -> │  Token Validation│ -> │  LiveStoreApp   │
│  (Auth Gate)    │    │   (Proactive)    │    │ (Valid Token)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Key Components

#### 1. AuthWrapper (`src/components/auth/AuthWrapper.tsx`)

**Responsibility**: Authentication gate that validates tokens before allowing LiveStore initialization

**Features**:
- Proactive token validation using `isAuthStateValid()`
- Token change listeners for reactive auth state updates
- Periodic validation every 2 minutes
- Tab focus validation when user returns to the application
- Clear authentication states: `loading`, `authenticated`, `unauthenticated`, `error`
- Graceful error handling with retry mechanisms

**Key Methods**:
- `validateAuth()`: Comprehensive auth state validation
- `handleSignInSuccess()`: Callback for successful authentication
- `handleRetry()`: Error recovery mechanism

#### 2. LiveStoreApp (`src/components/LiveStoreApp.tsx`)

**Responsibility**: LiveStore initialization and notebook rendering with a guaranteed valid token

**Features**:
- Only rendered when a valid authentication token is provided
- Handles LiveStore adapter configuration
- Manages notebook initialization and rendering
- Clean separation from authentication concerns

#### 3. Enhanced GoogleSignIn (`src/components/auth/GoogleSignIn.tsx`)

**Enhancements**:
- Added `onSuccess` and `onError` callback support
- Token change listeners for detecting successful authentication
- Better integration with the AuthWrapper workflow

#### 4. Simplified Root (`src/Root.tsx`)

**Changes**:
- Dramatically simplified from ~250 lines to ~11 lines
- Single responsibility: wrap AuthWrapper around LiveStoreApp
- No more complex auth state management in the root component

## Benefits

### 1. Clear User Experience
- **Loading States**: Users see clear "Validating Authentication" messages
- **Login Page**: Dedicated login interface with clear instructions
- **Error Handling**: Descriptive error messages with retry options
- **No Invisible Failures**: Users always know the auth state

### 2. Reliable Sync
- **Token Guarantee**: LiveStore only starts with valid tokens
- **No Race Conditions**: Authentication completes before sync initialization
- **Proactive Validation**: Token expiration detected before sync failures
- **Clean Recovery**: Auth failures trigger clean restart instead of state corruption

### 3. Maintainable Architecture
- **Separation of Concerns**: Auth logic separated from LiveStore logic
- **Testable Components**: Each component has a single responsibility
- **Clear Data Flow**: Token flows from AuthWrapper to LiveStoreApp
- **Reduced Complexity**: No more complex auth error handling in multiple places

## Implementation Details

### Authentication States

```typescript
type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'error'
```

- **loading**: Initial state, validating existing tokens
- **authenticated**: Valid token obtained, ready for LiveStore
- **unauthenticated**: No valid token, show login page
- **error**: Authentication error occurred, show retry options

### Token Validation Flow

1. **Initial Validation**: Check existing tokens on component mount
2. **Reactive Updates**: Listen for token changes via `googleAuthManager.addTokenChangeListener()`
3. **Periodic Checks**: Validate every 2 minutes to catch expiration
4. **Tab Focus Validation**: Revalidate when user returns to tab
5. **Proactive Expiration**: Detect tokens expiring within 5 minutes

### Error Recovery

1. **Automatic Retry**: Built-in retry mechanism for transient errors
2. **Manual Retry**: User-triggered retry for persistent issues
3. **Clear Messaging**: Specific error messages for different failure types
4. **Graceful Fallback**: Smooth transition between auth states

## Migration Guide

### Before (Old Architecture)
```typescript
// Complex auth handling mixed with LiveStore initialization
export const App: React.FC = () => {
  const [initialAuthToken] = useState(getCurrentAuthToken())
  
  return (
    <LiveStoreProvider syncPayload={{ authToken: initialAuthToken }}>
      <AuthGuard>
        <NotebookApp />
      </AuthGuard>
    </LiveStoreProvider>
  )
}
```

### After (Auth-First Architecture)
```typescript
// Clean separation of concerns
export const App: React.FC = () => {
  return (
    <AuthWrapper>
      {(authToken) => <LiveStoreApp authToken={authToken} />}
    </AuthWrapper>
  )
}
```

## Future Enhancements

### 1. Silent Token Refresh
- Implement background token refresh to avoid login prompts
- Use Google's refresh token flow for seamless token updates

### 2. Offline Auth Handling
- Better handling of auth validation when offline
- Cached token validation for offline scenarios

### 3. Multi-Account Support
- Support for multiple Google accounts
- Account switching without full re-authentication

### 4. Enhanced Security
- Token encryption for stored credentials
- Enhanced session management across tabs

## Testing Strategy

### Unit Tests
- AuthWrapper state transitions
- Token validation logic
- Error handling scenarios
- Callback function behavior

### Integration Tests
- Full authentication flow end-to-end
- LiveStore initialization with valid tokens
- Error recovery workflows
- Tab focus and visibility change handling

### Manual Testing Scenarios
1. **Fresh User**: First-time sign-in experience
2. **Token Expiration**: Behavior when tokens expire during use
3. **Network Issues**: Auth validation with poor connectivity
4. **Tab Switching**: Validation when switching between tabs
5. **Error Recovery**: User experience during auth failures

## Troubleshooting

### Common Issues

**Issue**: "Authentication Error" on valid Google account
**Solution**: Check `VITE_GOOGLE_CLIENT_ID` environment variable and Google OAuth configuration

**Issue**: Infinite loading on auth validation
**Solution**: Verify `getCurrentAuthToken()` and `isAuthStateValid()` implementations

**Issue**: LiveStore not initializing after successful auth
**Solution**: Check that `authToken` is properly passed to LiveStoreApp component

### Debug Mode

Enable debug logging by setting:
```typescript
localStorage.setItem('anode:auth:debug', 'true')
```

This will provide detailed console logs of auth state transitions and token validation steps.

## Architecture Decision Records

### ADR-1: Why Auth-First Instead of Auth-Within-LiveStore?

**Decision**: Implement authentication as a gate before LiveStore initialization rather than handling auth errors within LiveStore.

**Rationale**:
- LiveStore doesn't support dynamic sync payload updates
- Cleaner separation of concerns
- Better user experience with clear auth states
- Prevents state corruption from auth failures

**Alternatives Considered**:
- Dynamic token refresh within LiveStore (not supported by LiveStore)
- Error handling at the LiveStore level (complex and error-prone)
- Token polling mechanisms (inefficient and unreliable)

### ADR-2: Why Render Props Pattern for AuthWrapper?

**Decision**: Use render props pattern `{(authToken) => <LiveStoreApp authToken={authToken} />}` instead of direct child rendering.

**Rationale**:
- Explicit token passing ensures LiveStore gets valid token
- Clear data flow and dependencies
- Prevents accidental LiveStore initialization without token
- Type safety for token parameter

## Performance Considerations

### Token Validation Frequency
- **Every 2 minutes**: Balances responsiveness with performance
- **On tab focus**: Catches token expiration when user returns
- **On token change events**: Immediate validation for real-time updates

### Component Re-rendering
- AuthWrapper uses careful state management to minimize re-renders
- LiveStoreApp only re-initializes on token change (rare)
- Memoization for expensive validation operations

### Memory Management
- Proper cleanup of event listeners and intervals
- Token change listener cleanup on component unmount
- No memory leaks from periodic validation timers

This auth-first architecture provides a robust foundation for handling authentication in Anode while maintaining excellent user experience and system reliability.
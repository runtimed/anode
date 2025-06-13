export const getStoreId = () => {
  if (typeof window === 'undefined') return 'default-notebook'

  const searchParams = new URLSearchParams(window.location.search)

  // Check for notebook parameter (new simplified approach)
  const notebookId = searchParams.get('notebook')
  if (notebookId !== null && notebookId.trim() !== '') {
    return notebookId
  }

  // Check for legacy storeId parameter (backward compatibility)
  const storeId = searchParams.get('storeId')
  if (storeId !== null && storeId.trim() !== '') {
    return storeId
  }

  // Generate a new notebook ID and update URL
  const newNotebookId = `notebook-${Date.now()}-${Math.random().toString(36).slice(2)}`
  searchParams.set('notebook', newNotebookId)

  // Update URL without page reload
  const newUrl = `${window.location.pathname}?${searchParams.toString()}`
  window.history.replaceState(null, '', newUrl)

  return newNotebookId
}

// Helper to get the current notebook ID from URL without side effects
export const getCurrentNotebookId = () => {
  if (typeof window === 'undefined') return 'default-notebook'

  const searchParams = new URLSearchParams(window.location.search)
  return searchParams.get('notebook') || searchParams.get('storeId') || 'default-notebook'
}

// Helper to navigate to a specific notebook
export const navigateToNotebook = (notebookId: string) => {
  if (typeof window === 'undefined') return

  const searchParams = new URLSearchParams(window.location.search)
  searchParams.set('notebook', notebookId)

  // Remove legacy storeId if present
  searchParams.delete('storeId')

  const newUrl = `${window.location.pathname}?${searchParams.toString()}`
  window.location.href = newUrl
}

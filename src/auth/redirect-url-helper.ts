const NOTEBOOK_ID_KEY = "notebook-pre-auth";

export const redirectHelper = {
  saveNotebookId: () => {
    // Save the notebook id to session storage so that it can be used
    // after the user is authenticated.
    const params = new URLSearchParams(window.location.search);
    const notebook = params.get("notebook");
    if (notebook) {
      localStorage.setItem(NOTEBOOK_ID_KEY, notebook);
    }
  },
  navigateToSavedNotebook: (navigate: (to: string) => void) => {
    const notebookId = localStorage.getItem(NOTEBOOK_ID_KEY);
    if (notebookId) {
      localStorage.removeItem(NOTEBOOK_ID_KEY);
      navigate(`/?notebook=${notebookId}`);
    } else {
      navigate("/");
    }
  },
};

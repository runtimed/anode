function encodeLowerCrockford(bytes: Uint8Array<ArrayBuffer>): string {
  const BASE32 = "0123456789abcdefghjkmnpqrstvwxyz";
  let bits = 0,
    value = 0,
    output = "";
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32[(value << (5 - bits)) & 31];
  }
  return output.padEnd(26, "0"); // pad to 26 chars for 128 bits
}

export function prettyId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return encodeLowerCrockford(bytes);
}

export const getStoreId = () => {
  if (typeof window === "undefined") return "ssr-no-window";

  const searchParams = new URLSearchParams(window.location.search);

  const notebookId = searchParams.get("notebook");
  if (notebookId !== null && notebookId.trim() !== "") {
    return notebookId;
  }

  const newNotebookId = prettyId();

  searchParams.set("notebook", newNotebookId);

  // Update URL without page reload
  const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
  window.history.replaceState(null, "", newUrl);

  return newNotebookId;
};

// Helper to navigate to a specific notebook
export const navigateToNotebook = (notebookId: string) => {
  if (typeof window === "undefined") return;

  const searchParams = new URLSearchParams(window.location.search);
  searchParams.set("notebook", notebookId);

  const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
  window.location.href = newUrl;
};

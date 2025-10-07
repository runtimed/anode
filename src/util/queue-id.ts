export function generateQueueId() {
  return `exec-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

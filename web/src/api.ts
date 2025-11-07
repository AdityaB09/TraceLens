
// Resolve API base URL; can be overridden via VITE_API_URL
export const api: string =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8080";

// Helpers you may reuse
export async function getNodes() {
  return fetch(`${api}/graph/nodes`).then(r => r.json());
}
export async function getEdges() {
  return fetch(`${api}/graph/edges`).then(r => r.json());
}
export async function getModule(id: string) {
  return fetch(`${api}/graph/module/${encodeURIComponent(id)}`).then(r => r.json());
}
export async function explainModule(id: string) {
  return fetch(`${api}/explain/module/${encodeURIComponent(id)}`, { method: "POST" })
    .then(r => r.json());
}

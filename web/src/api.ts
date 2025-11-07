const API = import.meta.env.VITE_API_BASE || "http://localhost:8080";

export async function fetchNodes() {
  const r = await fetch(`${API}/graph/nodes`);
  return r.json();
}
export async function fetchEdges() {
  const r = await fetch(`${API}/graph/edges`);
  return r.json();
}
export async function searchNodes(q: string) {
  const r = await fetch(`${API}/graph/search?q=${encodeURIComponent(q)}`);
  return r.json();
}
export async function getModule(id: string) {
  const r = await fetch(`${API}/graph/module/${encodeURIComponent(id)}`);
  return r.json();
}
export async function explainModule(id: string) {
  const r = await fetch(`${API}/explain/module/${encodeURIComponent(id)}`, { method: "POST" });
  return r.json();
}

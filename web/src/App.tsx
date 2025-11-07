import React, { useEffect, useMemo, useState } from "react";
import { api, getNodes, getEdges, getModule, explainModule } from "./api";
import GraphView from "./components/GraphView";
import ModulePanel from "./components/ModulePanel";
import UploadBar from "./components/UploadBar";

type CyNode = { data: { id: string; label: string; deg?: number } };
type CyEdge = { data: { id: string; source: string; target: string; type: string } };
type RawNode = { id: string; name: string; namespace: string };
type RawEdge = { source: string; target: string; type: string };
type Stats = { n: number; e: number; p: number; project?: string };

function toElements(rawNodes: RawNode[], rawEdges: RawEdge[]) {
  const nodes: CyNode[] = rawNodes.map(n => ({ data: { id: n.id, label: `${n.namespace}.${n.name}` } }));
  const edges: CyEdge[] = [];
  const deg: Record<string, number> = {};
  let i = 0;
  for (const e of rawEdges) {
    edges.push({ data: { id: `e${i++}`, source: e.source, target: e.target, type: e.type } });
    deg[e.source] = (deg[e.source] || 0) + 1;
    deg[e.target] = (deg[e.target] || 0) + 1;
  }
  for (const n of nodes) n.data.deg = deg[n.data.id] || 0;
  return { nodes, edges };
}

export default function App() {
  // THEME
  const [theme, setTheme] = useState<"dark" | "light">(
    (localStorage.getItem("tracelens_theme") as any) || "dark"
  );
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("tracelens_theme", theme);
  }, [theme]);

  // RAW graph (empty until upload)
  const [rawNodes, setRawNodes] = useState<RawNode[]>([]);
  const [rawEdges, setRawEdges] = useState<RawEdge[]>([]);
  // Rendered subset
  const [elements, setElements] = useState<(CyNode | CyEdge)[]>([]);
  // Selection / explanation
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<any | null>(null);
  const [explanation, setExplanation] = useState<string | undefined>(undefined);
  // UI state
  const [q, setQ] = useState("");
  const [layoutName, setLayoutName] = useState<"concentric" | "cose" | "breadthfirst">("concentric");
  const [maxNodes, setMaxNodes] = useState<number>(350);
  const [stats, setStats] = useState<Stats | null>(null); // shows after upload

  // Build elements when inputs change
  useEffect(() => {
    const { nodes: allNodes, edges: allEdges } = toElements(rawNodes, rawEdges);

    const term = q.trim().toLowerCase();
    let nodes = !term ? allNodes : allNodes.filter(n => (n.data.label || "").toLowerCase().includes(term));
    if (nodes.length > maxNodes) {
      nodes = nodes.sort((a,b) => (b.data.deg||0) - (a.data.deg||0)).slice(0, maxNodes);
    }
    const nodeIds = new Set(nodes.map(n => n.data.id));
    const edges = allEdges.filter(e => nodeIds.has(e.data.source) && nodeIds.has(e.data.target));
    setElements([...nodes, ...edges]);
  }, [rawNodes, rawEdges, q, maxNodes]);

  // Grab module details on selection
  useEffect(() => {
    setExplanation(undefined);
    if (!selectedId) { setSelectedModule(null); return; }
    (async () => setSelectedModule(await getModule(selectedId)))();
  }, [selectedId]);

  async function handleExplain() {
    if (!selectedId) return;
    const j = await explainModule(selectedId);
    setExplanation(j.explanation);
  }

  // Called after successful upload with counts; then we fetch graph
  async function handleUploaded(s: Stats) {
    setStats(s);
    const [n, e] = await Promise.all([getNodes(), getEdges()]);
    setRawNodes(n);
    setRawEdges(e);
  }

  // reset to 0 nodes again
  function clearAll() {
    setRawNodes([]);
    setRawEdges([]);
    setElements([]);
    setQ("");
    setSelectedId(null);
    setSelectedModule(null);
    setExplanation(undefined);
    setStats(null);
  }

  // highlight set (for dimming in GraphView)
  const highlightIds = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return new Set<string>();
    return new Set(
      elements
        .filter((el: any) => el.data?.label && String(el.data.label).toLowerCase().includes(term))
        .map((el: any) => el.data.id)
    );
  }, [q, elements]);

  return (
    <>
      <div className="hdr">
        <div className="brand">TraceLens</div>
        <div className="badge">
          {stats ? `project=${stats.project||"uploaded"} · nodes=${stats.n}, edges=${stats.e}${stats.p?`, packages=${stats.p}`:""}` : "no project loaded"}
        </div>

        <div className="toolbar" style={{ marginLeft: "auto" }}>
          <div className="switch">
            <span style={{color:"var(--muted)"}}>Theme</span>
            <button className="ghost" onClick={()=>setTheme(theme==="dark"?"light":"dark")}>
              {theme==="dark" ? "🌙 Dark" : "☀️ Light"}
            </button>
          </div>
          <button className="ghost" onClick={clearAll}>Clear</button>
          <UploadBar onUploaded={handleUploaded}/>
        </div>
      </div>

      <div className="container">
        <div className="toolbar" style={{ marginBottom: 8 }}>
          <input
            placeholder="Search module or namespace…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: 260 }}
            disabled={!stats}
          />
          <button className="secondary" onClick={() => setQ("")} disabled={!stats}>Reset</button>

          <span className="badge">Max nodes</span>
          <input
            type="number"
            min={50}
            max={2000}
            step={50}
            value={maxNodes}
            onChange={(e) => setMaxNodes(Math.max(50, Math.min(2000, Number(e.target.value) || 50)))}
            style={{ width: 90 }}
            title="Show top-degree nodes up to this limit"
            disabled={!stats}
          />

          <span className="badge">Layout</span>
          <select value={layoutName} onChange={(e) => setLayoutName(e.target.value as any)} disabled={!stats}>
            <option value="concentric">concentric (clear)</option>
            <option value="cose">cose (force)</option>
            <option value="breadthfirst">breadthfirst (tree-ish)</option>
          </select>

          <button onClick={handleExplain} disabled={!stats || !selectedId}>Explain selected</button>
        </div>

        <div className="grid">
          <div className="card">
            {stats ? (
              <GraphView
                elements={elements}
                highlightIds={highlightIds}
                layoutName={layoutName}
                onSelectNode={(id) => setSelectedId(id)}
              />
            ) : (
              <div style={{height:"100%",display:"grid",placeItems:"center",color:"var(--muted)"}}>
                Upload a ZIP to generate the graph.
              </div>
            )}
          </div>
          <div className="card">
            <ModulePanel
              mod={selectedModule}
              explanation={explanation}
              onExplain={handleExplain}
              canExplain={!!selectedId}
              showing={`${elements.filter((el:any)=>!el.data?.source).length}/${rawNodes.length}`}
            />
          </div>
        </div>
      </div>
    </>
  );
}

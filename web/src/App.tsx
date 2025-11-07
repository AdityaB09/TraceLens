import React, { useEffect, useMemo, useState } from "react";
import { api, getNodes, getEdges, getModule, explainModule } from "./api";
import GraphView from "./components/GraphView";
import ModulePanel from "./components/ModulePanel";
import UploadBar from "./components/UploadBar";

type CyNode = { data: { id: string; label: string; deg?: number } };
type CyEdge = { data: { id: string; source: string; target: string; type: string } };

type RawNode = { id: string; name: string; namespace: string };
type RawEdge = { source: string; target: string; type: string };

function toElements(rawNodes: RawNode[], rawEdges: RawEdge[]): { nodes: CyNode[]; edges: CyEdge[]; deg: Record<string, number> } {
  const nodes: CyNode[] = rawNodes.map(n => ({ data: { id: n.id, label: `${n.namespace}.${n.name}` } }));
  const edges: CyEdge[] = [];
  const deg: Record<string, number> = {};
  let i = 0;
  for (const e of rawEdges) {
    edges.push({ data: { id: `e${i++}`, source: e.source, target: e.target, type: e.type } });
    deg[e.source] = (deg[e.source] || 0) + 1;
    deg[e.target] = (deg[e.target] || 0) + 1;
  }
  // attach degree to nodes
  for (const n of nodes) n.data.deg = deg[n.data.id] || 0;
  return { nodes, edges, deg };
}

export default function App() {
  // raw full graph
  const [rawNodes, setRawNodes] = useState<RawNode[]>([]);
  const [rawEdges, setRawEdges] = useState<RawEdge[]>([]);
  // rendered subset
  const [elements, setElements] = useState<(CyNode | CyEdge)[]>([]);
  // selection / module view
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<any | null>(null);
  const [explanation, setExplanation] = useState<string | undefined>(undefined);

  // UI state
  const [q, setQ] = useState("");
  const [layoutName, setLayoutName] = useState<"concentric" | "cose" | "breadthfirst">("concentric");
  const [maxNodes, setMaxNodes] = useState<number>(350);
  const [ingestStats, setIngestStats] = useState<{n:number;e:number;p:number}|null>(null);

  async function reload() {
    const [n, e] = await Promise.all([getNodes(), getEdges()]);
    setRawNodes(n);
    setRawEdges(e);
    setSelectedId(null);
    setSelectedModule(null);
    setExplanation(undefined);
    // if the backend returns counts on upload, the UploadBar shows them; otherwise compute here
    setIngestStats({ n: n.length, e: e.length, p: 0 });
  }

  useEffect(() => { reload(); }, []);

  // recompute the visual subset whenever inputs change
  useEffect(() => {
    const { nodes: allNodes, edges: allEdges, deg } = toElements(rawNodes, rawEdges);

    // 1) text filter on nodes
    const term = q.trim().toLowerCase();
    let nodes = !term
      ? allNodes
      : allNodes.filter(n => (n.data.label || "").toLowerCase().includes(term));

    // 2) top-K by degree if exceeding maxNodes
    if (nodes.length > maxNodes) {
      nodes = nodes
        .sort((a, b) => (b.data.deg || 0) - (a.data.deg || 0))
        .slice(0, maxNodes);
    }
    const nodeIds = new Set(nodes.map(n => n.data.id));

    // 3) keep edges only if **both** endpoints are in nodeIds (prevents Cytoscape “nonexistent target”)
    const edges = allEdges.filter(e => nodeIds.has(e.data.source) && nodeIds.has(e.data.target));

    setElements([...nodes, ...edges]);
  }, [rawNodes, rawEdges, q, maxNodes]);

  // fetch selected module details
  useEffect(() => {
    setExplanation(undefined);
    if (!selectedId) { setSelectedModule(null); return; }
    (async () => { setSelectedModule(await getModule(selectedId)); })();
  }, [selectedId]);

  async function handleExplain() {
    if (!selectedId) return;
    const j = await explainModule(selectedId);
    setExplanation(j.explanation);
  }

  // highlight (for dimming others inside GraphView)
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
        {ingestStats && (
          <div className="badge">ingested nodes={ingestStats.n}, edges={ingestStats.e}{ingestStats.p?`, packages=${ingestStats.p}`:""}</div>
        )}
        <div className="toolbar" style={{ marginLeft: "auto" }}>
          <UploadBar onUploaded={reload} />
        </div>
      </div>

      <div className="container">
        <div className="toolbar" style={{ marginBottom: 8 }}>
          <input
            placeholder="Search module or namespace…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: 260 }}
          />
          <button className="secondary" onClick={() => setQ("")}>Reset</button>

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
          />

          <span className="badge">Layout</span>
          <select value={layoutName} onChange={(e) => setLayoutName(e.target.value as any)}>
            <option value="concentric">concentric (clear)</option>
            <option value="cose">cose (force)</option>
            <option value="breadthfirst">breadthfirst (tree-ish)</option>
          </select>

          <button onClick={handleExplain} disabled={!selectedId}>Explain selected</button>
        </div>

        <div className="grid">
          <div className="card">
            <GraphView
              elements={elements}
              highlightIds={highlightIds}
              layoutName={layoutName}
              onSelectNode={(id) => setSelectedId(id)}
            />
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

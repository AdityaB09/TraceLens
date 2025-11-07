import React, { useEffect, useMemo, useState } from "react";
import { fetchNodes, fetchEdges, searchNodes, getModule, explainModule } from "./api";
import GraphView from "./components/GraphView";
import ModulePanel from "./components/ModulePanel";

export default function App() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string|undefined>(undefined);
  const [selected, setSelected] = useState<any>(undefined);
  const [explanation, setExplanation] = useState<string|undefined>(undefined);
  const [loadingExplain, setLoadingExplain] = useState(false);

  useEffect(() => {
    (async () => {
      setNodes(await fetchNodes());
      setEdges(await fetchEdges());
    })();
  }, []);

  const elements = useMemo(() => {
    const ns = (nodes||[]).map((n:any) => ({
      data: { id: n.id, label: `${n.name}\n(${n.namespace})` }
    }));
    const es = (edges||[]).map((e:any) => ({
      data: { source: e.source, target: e.target }
    }));
    return [...ns, ...es];
  }, [nodes, edges]);

  const onSelectNode = async (id: string) => {
    setSelectedId(id);
    setExplanation(undefined);
    setSelected(await getModule(id));
  };

  const doSearch = async () => {
    const hits = await searchNodes(query);
    // focus first result (simple UX)
    if (hits?.[0]?.id) onSelectNode(hits[0].id);
  };

  const doExplain = async () => {
    if (!selectedId) return;
    setLoadingExplain(true);
    try {
      const r = await explainModule(selectedId);
      setExplanation(r.explanation);
    } finally {
      setLoadingExplain(false);
    }
  };

  return (
    <div style={{padding:12}}>
      <div className="toolbar">
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search module or namespace"/>
        <button onClick={doSearch}>Search</button>
        <button onClick={doExplain} disabled={!selectedId || loadingExplain}>
          {loadingExplain ? "Explaining..." : "Explain selected"}
        </button>
      </div>

      <div className="row">
        <div className="panel">
          <div style={{height:"100%"}}>
            <GraphView elements={elements} onSelectNode={onSelectNode}/>
          </div>
        </div>
        <ModulePanel mod={selected} explanation={explanation}/>
      </div>
    </div>
  );
}

import React from "react";

export default function ModulePanel({
  mod,
  explanation,
  onExplain,
  canExplain,
  showing,
}: {
  mod: any;
  explanation: string | undefined;
  onExplain: () => void;
  canExplain: boolean;
  showing: string; // "shown/total"
}) {
  if (!mod)
    return (
      <div style={{ color: "#94a3b8" }}>
        Select a node to view details. Showing {showing} nodes.
      </div>
    );

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ margin: "6px 0 0 0" }}>{mod.name}</h3>
        <button onClick={onExplain} disabled={!canExplain}>Explain</button>
      </div>
      <div className="kv" style={{ marginBottom: 6 }}>
        Namespace: {mod.namespace} &nbsp;•&nbsp; Kind: {mod.kind}
      </div>
      <div className="kv" style={{ marginBottom: 10 }}>File: {mod.filePath}</div>

      <h4 style={{ margin: "10px 0 6px" }}>Direct Imports</h4>
      <ul>{(mod.imports || []).map((x: string) => <li key={x}>{x}</li>)}</ul>

      <h4 style={{ margin: "10px 0 6px" }}>Incoming</h4>
      <ul>{(mod.incoming || []).map((r: any) => <li key={r.nodeId}>{r.sourceName}</li>)}</ul>

      <h4 style={{ margin: "10px 0 6px" }}>Outgoing</h4>
      <ul>{(mod.outgoing || []).map((r: any) => <li key={r.nodeId}>{r.targetName}</li>)}</ul>

      <h4 style={{ margin: "10px 0 6px" }}>Packages (quick risk view)</h4>
      <ul>
        {(mod.packageRisks || []).slice(0, 10).map((p: any) => (
          <li key={p.package}>
            {p.package} {p.version && `@ ${p.version}`} –{" "}
            <span className={p.risk?.toLowerCase().includes("high") ? "danger" : ""}>
              {p.risk || "Unknown"}
            </span>
            {p.license ? ` • ${p.license}` : ""}
          </li>
        ))}
      </ul>

      <h4 style={{ margin: "12px 0 6px" }}>LLM: Explanation</h4>
      <div style={{ whiteSpace: "pre-wrap" }}>
        {explanation || "(Click “Explain” to generate a local, data-driven summary)"}
      </div>
    </div>
  );
}

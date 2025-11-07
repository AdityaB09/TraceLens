import React from "react";

export default function ModulePanel({mod, explanation}:{mod:any, explanation:string|undefined}) {
  if (!mod) return <div className="panel">Select a node in the graph.</div>;

  return (
    <div className="panel" style={{height:"100%", overflow:"auto"}}>
      <h3 style={{marginTop:0}}>{mod.name}</h3>
      <div className="kv">Namespace: {mod.namespace} &nbsp;•&nbsp; Kind: {mod.kind}</div>
      <div className="kv">File: {mod.filePath}</div>

      <h4>Direct Imports</h4>
      <ul>{(mod.imports||[]).map((x:string)=> <li key={x}>{x}</li>)}</ul>

      <h4>Incoming</h4>
      <ul>{(mod.incoming||[]).map((r:any)=> <li key={r.nodeId}>{r.sourceName}</li>)}</ul>

      <h4>Outgoing</h4>
      <ul>{(mod.outgoing||[]).map((r:any)=> <li key={r.nodeId}>{r.targetName}</li>)}</ul>

      <h4>Packages (quick risk view)</h4>
      <ul>
        {(mod.packageRisks||[]).map((p:any)=>(
          <li key={p.package}>
            {p.package} {p.version && `@ ${p.version}`} – <span className={p.risk?.toLowerCase().includes("high") ? "danger" : ""}>{p.risk||"Unknown"}</span>
            {p.license ? ` • ${p.license}` : ""}
          </li>
        ))}
      </ul>

      <h4>LLM: Explanation</h4>
      <div style={{whiteSpace:"pre-wrap"}}>{explanation||"(click Explain)"}</div>
    </div>
  );
}

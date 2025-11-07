import React, { useState } from "react";
import { api } from "../api";  // now valid named export

export default function UploadBar({ onUploaded }: { onUploaded: () => void }) {
  const [project, setProject] = useState("Demo");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function doUpload() {
    if (!file) { setMsg("Choose a zip file first."); return; }
    setBusy(true); setMsg("Uploading...");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${api}/projects/upload?projectName=${encodeURIComponent(project)}`, {
        method: "POST",
        body: fd,
      });
      const j = await res.json();
      setMsg(`Ingested: nodes=${j.nodes}, edges=${j.edges}, packages=${j.packages}`);
      onUploaded();
    } catch (e:any) {
      setMsg(`Upload failed: ${e?.message || e}`);
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
      <input type="text" value={project} onChange={e=>setProject(e.target.value)} placeholder="Project name" />
      <input type="file" accept=".zip" onChange={e=>setFile(e.target.files?.[0] || null)} />
      <button disabled={busy || !file} onClick={doUpload}>Upload</button>
      <span style={{ opacity:.8 }}>{msg}</span>
    </div>
  );
}

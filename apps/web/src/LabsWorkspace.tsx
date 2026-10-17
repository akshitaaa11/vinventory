import { useEffect, useState } from "react";
import { labsResponseSchema, type LabSummary } from "@vinventory/contracts";
import { ApiError, request, type CurrentUser } from "./api";
import { Icon } from "./icons";
import { InventoryImport } from "./InventoryImport";

export function LabsWorkspace({ user, onExpired }: { user: CurrentUser; onExpired: () => void }) {
  const [labs, setLabs] = useState<LabSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    request<unknown>("/api/labs").then(body => {
      const parsed = labsResponseSchema.safeParse(body);
      if (!parsed.success) throw new Error("We couldn’t read the lab directory. Please try again.");
      if (active) setLabs(parsed.data.labs);
    }).catch((reason: unknown) => {
      if (!active) return;
      if (reason instanceof ApiError && reason.status === 401) onExpired();
      else setError(reason instanceof Error ? reason.message : "Could not load labs.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);
  const path = window.location.pathname;
  const detailId = path.split("/")[2];
  const selected = labs.find(lab => lab.id === detailId);
  const isImport = path.endsWith("/import");
  const filtered = labs.filter(lab => `${lab.code} ${lab.name} ${lab.location ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <main id="main-content" className="container workspace">
    <div className="breadcrumb"><a href="/">Home</a><span>/</span>{detailId ? <a href="/labs">Labs</a> : <span>Labs</span>}{selected && <><span>/</span><span>{selected.code}</span></>}</div>
    {loading ? <div className="empty-state" role="status"><Icon name="labs"/><h1>Loading your labs…</h1><p>Getting your workspace ready.</p></div> : error ? <div className="empty-state"><Icon name="labs"/><h1>Labs are temporarily unavailable.</h1><p role="alert">{error}</p><button onClick={() => setRetry(n=>n+1)}>Try again</button></div> : detailId ? selected ? <>
      <div className="workspace-title"><div><p className="eyebrow">{selected.code} / LAB WORKSPACE</p><h1>{selected.name}</h1><p><Icon name="pin"/>{selected.location || "Location not provided"}</p></div><a className="button secondary" href="/labs">Back to all labs</a></div>
      {isImport ? selected.canManageStock ? <><h2>Import inventory</h2><InventoryImport initialLabId={selected.id}/></> : <div className="empty-state"><Icon name="shield"/><h2>Stock management is restricted.</h2><p>Only authorized staff can import inventory for this lab.</p><a href={`/labs/${selected.id}`}>Back to lab overview</a></div> : <section className="card lab-overview"><Icon name="box"/><h2>Lab inventory</h2><p>This directory introduces the lab. Equipment browsing and borrowing will be available as the lab catalogue is published.</p>{selected.canManageStock ? <a className="button blue" href={`/labs/${selected.id}/import`}><Icon name="upload"/>Import equipment records</a> : <p className="muted">The lab team manages equipment records and access.</p>}</section>}
    </> : <div className="empty-state"><Icon name="labs"/><h1>Lab not found.</h1><p>This lab may no longer be active.</p><a className="button blue" href="/labs">View all labs</a></div> : <>
      <div className="workspace-title"><div><p className="eyebrow">YOUR CAMPUS WORKSPACE</p><h1>Explore the labs.</h1><p>Welcome, {user.displayName}. Find your lab and get started.</p></div><span className="badge"><span className="status-dot"/>{labs.length} {labs.length===1?"lab":"labs"}</span></div>
      <div className="directory-toolbar"><h2>All labs <span className="count mono">{labs.length}</span></h2><label className="search"><Icon name="search"/><span className="sr-only">Search labs</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by lab, code or location"/></label></div>
      {!labs.length ? <div className="empty-state dashed"><Icon name="labs"/><h2>No labs have been added yet.</h2><p>You’re signed in. The administrator still needs to publish the first lab; it will appear here when it’s ready.</p><span className="badge">Your account is connected</span></div> : !filtered.length ? <div className="empty-state dashed"><Icon name="search"/><h2>No matching labs.</h2><p>Try another name, lab code, or location.</p><button className="secondary" onClick={()=>setQuery("")}>Clear search</button></div> : <div className="labs-grid">{filtered.map(lab=><article className="lab-card" key={lab.id}><div className="lab-card-top"><span className="lab-icon"><Icon name="labs"/></span><span className="mono lab-code">{lab.code}</span></div><h2>{lab.name}</h2><p><Icon name="pin"/>{lab.location || "Location not provided"}</p><div className="lab-card-footer"><span className="badge">{lab.canManageStock ? "Stock management" : "Lab directory"}</span><a className="text-link" href={`/labs/${lab.id}`} aria-label={`View ${lab.name}`}>View lab<Icon name="arrow"/></a></div></article>)}</div>}
      <div className="workspace-note"><Icon name="shield"/><p>You can explore all participating labs. Stock management is available only in labs where you have permission.</p></div>
    </>}
  </main>;
}

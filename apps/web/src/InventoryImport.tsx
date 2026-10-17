import { useEffect, useRef, useState } from "react";
import type { ImportLab, ImportPolicy, ImportPreview, ImportResult, InventoryImportFile } from "@vinventory/contracts";

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, credentials: "same-origin" });
  if (response.status === 401) throw new Error("Sign in with VAuth to import inventory.");
  if (response.status === 403) throw new Error("You do not have permission to manage stock in this lab.");
  const body = await response.json().catch(() => null) as (T & { message?: string }) | null;
  if (!body && response.status >= 500) throw new Error("The API is unavailable. Start the API and refresh this page.");
  if (!response.ok) throw new Error(body?.message ?? "The request failed. Please try again.");
  if (!body) throw new Error("The API is unavailable. Start the API and try again.");
  return body;
}

async function readFile(file: File): Promise<InventoryImportFile> {
  if (!/\.(csv|xlsx)$/i.test(file.name)) throw new Error("Choose CSV or Excel (.xlsx). Save older .xls files as .xlsx first.");
  if (file.size > 2 * 1024 * 1024) throw new Error("Choose a file up to 2 MB.");
  const content = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
  return { filename: file.name, content };
}

export function InventoryImport({ initialLabId = "" }: { initialLabId?: string }) {
  const [labs, setLabs] = useState<ImportLab[]>([]);
  const [labId, setLabId] = useState("");
  const [policies, setPolicies] = useState<ImportPolicy[]>([]);
  const [policyId, setPolicyId] = useState("");
  const [storage, setStorage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [upload, setUpload] = useState<InventoryImportFile | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [error, setError] = useState("");
  const [setupError, setSetupError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const abort = new AbortController();
    api<{ labs: ImportLab[] }>("/api/import-labs", { signal: abort.signal })
      .then(({ labs: available }) => {
        setLabs(available); setLabId(available.find((lab) => lab.id === initialLabId)?.id ?? available[0]?.id ?? "");
        if (!available.length) setSetupError("No labs are assigned to you with stock-management access. Ask the administrator to configure M201 and your lab membership.");
      })
      .catch((reason: Error) => { if (!abort.signal.aborted) setSetupError(reason.message); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [initialLabId]);

  useEffect(() => {
    setPreview(null); setUpload(null); setConfirmed(false); setResult(null);
    setPolicies([]); setPolicyId("");
    setStorage(labs.find((lab) => lab.id === labId)?.location ?? "");
    if (!labId) return;
    const abort = new AbortController();
    setLoadingPolicies(true); setError("");
    api<{ policies: ImportPolicy[] }>(`/api/labs/${labId}/import-policies`, { signal: abort.signal })
      .then(({ policies: available }) => setPolicies(available))
      .catch((reason: Error) => { if (!abort.signal.aborted) setError(reason.message); })
      .finally(() => { if (!abort.signal.aborted) setLoadingPolicies(false); });
    return () => abort.abort();
  }, [labId, labs]);

  async function previewFile() {
    if (!file || !labId) return;
    setBusy(true); setError(""); setPreview(null); setUpload(null); setConfirmed(false); setResult(null);
    try {
      const data = await readFile(file);
      const rows = await api<ImportPreview>(`/api/labs/${labId}/inventory/import/preview`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      setUpload(data); setPreview(rows);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not preview the file."); }
    finally { setBusy(false); }
  }

  async function importFile() {
    if (!upload || !confirmed) return;
    setBusy(true); setError("");
    try {
      const saved = await api<ImportResult>(`/api/labs/${labId}/inventory/import`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...upload, policyId, storageLocation: storage, confirmed }),
      });
      setResult(saved); setPreview(null); setUpload(null); setFile(null); setConfirmed(false);
      if (fileInput.current) fileInput.current.value = "";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not import the file.");
      setPreview(null); setUpload(null); setConfirmed(false);
    } finally { setBusy(false); }
  }

  return (
    <div className="import-workspace">
      <p className="muted">Add returnable equipment from a CSV or Excel file. Imported records await physical verification.</p>

      <section className="card" aria-labelledby="format-title">
        <div className="section-heading"><h2 id="format-title">1. Prepare your file</h2><a className="button secondary" href="/inventory-template.csv" download>Download CSV template</a></div>
        <p>Use these columns in the first row. CSV and Excel <strong>.xlsx</strong> are supported, up to 2 MB and 500 items. Use one populated worksheet, with plain values.</p>
        <div className="column-list"><span>Stock code</span><span>Item/model name</span><span>Tracking</span><span>Quantity</span><span>Asset tags <small>if individual</small></span></div>
        <p className="muted">Tracking must be <code>individual</code> or <code>quantity</code>. For individual items, separate tags with semicolons and provide one per unit. Keep stock codes and tags as text to preserve leading zeros. Quantities must be whole numbers.</p>
      </section>

      <section className="card" aria-labelledby="upload-title">
        <h2 id="upload-title">2. Choose a lab and preview</h2>
        {loading && <p role="status">Loading your labs…</p>}
        {setupError && <p className="notice" role="status">{setupError}</p>}
        <fieldset disabled={busy || loading || !labs.length}>
          <div className="form-grid">
            <label>Lab<select value={labId} onChange={(event) => setLabId(event.target.value)}><option value="">Select a lab</option>{labs.map((lab) => <option key={lab.id} value={lab.id}>{lab.code} — {lab.name}</option>)}</select></label>
            <label>Inventory file<input ref={fileInput} type="file" accept=".csv,.xlsx" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); setUpload(null); setConfirmed(false); setResult(null); setError(""); }} /></label>
          </div>
          <button type="button" onClick={() => void previewFile()} disabled={!file || !labId || busy}>Preview file</button>
        </fieldset>
        {busy && <p role="status">Processing your file…</p>}
        {error && <p className="error" role="alert">{error}</p>}
        {result && <p className="success" role="status">Imported {result.imported} item records and {result.units} units. They are awaiting physical verification and testing before becoming available for lending.</p>}
      </section>

      {preview && <section className="card" aria-labelledby="review-title">
        <h2 id="review-title">3. Review and import</h2>
        <p>{preview.rows.length} item records in <strong>{upload?.filename}</strong>. Existing stock will not be overwritten.</p>
        {!!preview.issues.length && <div className="error" role="alert"><strong>Fix {preview.issues.length} errors and preview the corrected file.</strong><ul>{preview.issues.map((issue, index) => <li key={index}>{issue.row ? `Row ${issue.row} · ` : ""}{issue.field}: {issue.message}</li>)}</ul></div>}
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Inventory preview"><table>
          <thead><tr><th>Row</th><th>Stock code</th><th>Item/model name</th><th>Tracking</th><th>Quantity</th><th>Asset tags</th></tr></thead>
          <tbody>{preview.rows.map((row) => <tr key={row.row}><td>{row.row}</td><td>{row.stockCode}</td><td>{row.name}</td><td>{row.tracking}</td><td>{row.quantity}</td><td>{row.assetTags.join("; ") || "—"}</td></tr>)}</tbody>
        </table></div>
        <fieldset disabled={busy || !!preview.issues.length}>
          <div className="form-grid">
            <label>Borrowing policy for this batch<select value={policyId} disabled={loadingPolicies} onChange={(event) => { setPolicyId(event.target.value); setConfirmed(false); }}><option value="">Choose a policy</option>{policies.map((policy) => <option key={policy.id} value={policy.id}>{policy.name} ({policy.defaultLoanDays} days)</option>)}</select></label>
            <label>Storage location<input value={storage} maxLength={200} onChange={(event) => { setStorage(event.target.value); setConfirmed(false); }} placeholder="e.g. M201, cabinet A" /></label>
          </div>
          {!loadingPolicies && !policies.length && <p className="notice">This lab needs an active returnable-item borrowing policy before import. Ask the incharge or administrator to configure one.</p>}
          <label className="confirmation"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I have reviewed these records. Imported stock will await physical verification and testing.</label>
          <button type="button" onClick={() => void importFile()} disabled={!confirmed || !policyId || !storage.trim() || busy || !!preview.issues.length}>Import {preview.rows.length} items</button>
        </fieldset>
      </section>}
      <p className="muted">Returnable-item imports only. Borrowing records and due dates are managed separately.</p>
    </div>
  );
}

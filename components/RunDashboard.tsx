import React, { useState } from "react";
import type { AgentRun, GeneratedFile } from "../types";

export default function RunDashboard({ run, onBack, onUpdateRun }: { run: AgentRun; onBack: () => void; onUpdateRun: (run: AgentRun) => void }) {
  const [tab, setTab] = useState<"code" | "review" | "execution" | "summary">("summary");
  const [editFile, setEditFile] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const saveEdit = () => {
    if (!editFile) return;
    const nextFiles = run.generated_code.map((f) =>
      f.path === editFile ? { ...f, content: editContent } : f
    );
    onUpdateRun({ ...run, generated_code: nextFiles });
    setEditFile(null);
  };

  const requestSandbox = () => {
    window.zenfox.emitEvent("run_in_sandbox", {
      runId: run.id,
      files: run.generated_code,
      environment: run.task.execution_environment,
    });
  };

  const requestDeploy = () => {
    window.zenfox.emitEvent("deploy_to_github", {
      runId: run.id,
      repository_url: run.task.repository_url,
      files: run.generated_code,
    });
  };

  return (
    <div>
      <button className="btn btn-ghost mb-4" onClick={onBack}>← Back</button>
      <h2 className="text-2xl font-bold mb-4">Run Details</h2>

      <div className="tabs tabs-boxed mb-4">
        {(["summary", "code", "review", "execution"] as const).map((t) => (
          <button key={t} className={`tab ${tab === t ? "tab-active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "summary" && (
        <div className="card bg-base-200 shadow">
          <div className="card-body">
            <h3 className="card-title">{run.summary.message}</h3>
            <p>Status: <span className={`badge ${run.summary.status === "success" ? "badge-success" : run.summary.status === "revision_needed" ? "badge-warning" : "badge-error"}`}>{run.summary.status}</span></p>
            <p>Quality Score: {run.review_report.quality_score}/100</p>
            <p className="mt-2">{run.summary.next_steps}</p>
            {run.summary.status !== "failed" && (
              <div className="card-actions mt-4 gap-2">
                <button className="btn btn-secondary" onClick={requestSandbox}>Run in Sandbox</button>
                <button className="btn btn-primary" onClick={requestDeploy}>Push to GitHub</button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "code" && (
        <div className="space-y-3">
          {run.generated_code.length === 0 && <div className="text-gray-500">No code generated.</div>}
          {run.generated_code.map((file) => (
            <div key={file.path} className="card bg-base-200 shadow">
              <div className="card-body">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-mono font-bold">{file.path}</h4>
                  <button className="btn btn-xs btn-ghost" onClick={() => { setEditFile(file.path); setEditContent(file.content); }}>Edit</button>
                </div>
                {editFile === file.path ? (
                  <div>
                    <textarea className="textarea textarea-bordered w-full font-mono text-xs" rows={12} value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                    <div className="flex gap-2 mt-2">
                      <button className="btn btn-sm btn-primary" onClick={saveEdit}>Save</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => setEditFile(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <pre className="bg-base-300 p-3 rounded overflow-x-auto text-xs">{file.content}</pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "review" && (
        <div className="card bg-base-200 shadow">
          <div className="card-body">
            <h3 className="card-title">Review Report</h3>
            <p>Quality Score: <span className="font-bold text-lg">{run.review_report.quality_score}</span>/100</p>
            <div className="mt-4">
              <h4 className="font-semibold">Security Issues</h4>
              {run.review_report.security_issues.length === 0 ? <p className="text-success">None found.</p> : (
                <ul className="list-disc list-inside text-error">
                  {run.review_report.security_issues.map((issue, i) => <li key={i}>{issue}</li>)}
                </ul>
              )}
            </div>
            <div className="mt-4">
              <h4 className="font-semibold">Suggested Improvements</h4>
              {run.review_report.suggested_improvements.length === 0 ? <p className="text-gray-500">None.</p> : (
                <ul className="list-disc list-inside">
                  {run.review_report.suggested_improvements.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              )}
            </div>
            <div className="mt-4">
              <span className={`badge ${run.review_report.passed ? "badge-success" : "badge-error"}`}>
                {run.review_report.passed ? "PASSED" : "FAILED"}
              </span>
            </div>
          </div>
        </div>
      )}

      {tab === "execution" && (
        <div className="card bg-base-200 shadow">
          <div className="card-body">
            <h3 className="card-title">Execution Results</h3>
            <p>Success: <span className={`badge ${run.execution_results.success ? "badge-success" : "badge-error"}`}>{run.execution_results.success ? "Yes" : "No"}</span></p>
            {run.execution_results.error_message && <p className="text-error mt-2">{run.execution_results.error_message}</p>}
            <div className="mt-4">
              <h4 className="font-semibold">Logs</h4>
              <pre className="bg-base-300 p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap">{run.execution_results.logs}</pre>
            </div>
            {!run.execution_results.success && run.execution_results.logs === "Execution not yet run. Click 'Run in Sandbox'." && (
              <div className="card-actions mt-4">
                <button className="btn btn-secondary" onClick={requestSandbox}>Run in Sandbox</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

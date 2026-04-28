import React, { useState } from 'react';
import { AgentRun } from '../types';

interface Props {
  run: AgentRun;
  onBack: () => void;
  onUpdateRun?: (run: AgentRun) => void;
}

export function RunDashboard({ run, onBack, onUpdateRun }: Props) {
  const [tab, setTab] = useState<'code' | 'review' | 'exec' | 'summary'>('code');
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [sandboxStatus, setSandboxStatus] = useState<'idle' | 'pending' | 'done'>('idle');
  const [deployStatus, setDeployStatus] = useState<'idle' | 'pending' | 'done'>('idle');

  const startEdit = (file: { filename: string; content: string }) => {
    setEditingFile(file.filename);
    setEditContent(file.content);
  };

  const cancelEdit = () => {
    setEditingFile(null);
    setEditContent('');
  };

  const saveEdit = () => {
    if (!editingFile || !onUpdateRun) return;
    const updatedFiles = run.generated_code.map((f) =>
      f.filename === editingFile ? { ...f, content: editContent } : f
    );
    onUpdateRun({ ...run, generated_code: updatedFiles });
    setEditingFile(null);
    setEditContent('');
  };

  const handleRunSandbox = () => {
    setSandboxStatus('pending');
    window.zenfox?.emitEvent('run_sandbox', {
      runId: run.id,
      files: run.generated_code.map((f) => ({ filename: f.filename, content: f.content })),
      stack: run.inputs.target_stack,
      environment: run.inputs.execution_environment,
      config: run.inputs.config,
    });
  };

  const handleDeployGitHub = () => {
    setDeployStatus('pending');
    window.zenfox?.emitEvent('deploy_github', {
      runId: run.id,
      repoUrl: run.inputs.repository_url,
      files: run.generated_code.map((f) => ({ filename: f.filename, content: f.content })),
      branch: run.deployment_info.branch || 'main',
      config: run.inputs.config,
    });
  };

  const inputSummary = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-4">
      <div className="bg-base-300 p-2 rounded">
        <div className="opacity-60">Stack</div>
        <div className="font-semibold truncate">{run.inputs.target_stack || '—'}</div>
      </div>
      <div className="bg-base-300 p-2 rounded">
        <div className="opacity-60">Docker</div>
        <div className="font-semibold truncate">{run.inputs.execution_environment.docker_image || '—'}</div>
      </div>
      <div className="bg-base-300 p-2 rounded">
        <div className="opacity-60">Style</div>
        <div className="font-semibold">{run.inputs.config.coding_style || '—'}</div>
      </div>
      <div className="bg-base-300 p-2 rounded">
        <div className="opacity-60">Tests</div>
        <div className="font-semibold">{run.inputs.config.test_preferences?.framework || '—'}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button className="btn btn-sm btn-ghost" onClick={onBack}>← Back</button>
        <h2 className="text-xl font-bold">Run {run.id}</h2>
        <span className="badge badge-outline">{new Date(run.created_at).toLocaleString()}</span>
      </div>

      {inputSummary}

      <div className="tabs tabs-boxed">
        <button className={`tab ${tab === 'code' ? 'tab-active' : ''}`} onClick={() => setTab('code')}>Generated Code ({run.generated_code.length})</button>
        <button className={`tab ${tab === 'review' ? 'tab-active' : ''}`} onClick={() => setTab('review')}>Review Report</button>
        <button className={`tab ${tab === 'exec' ? 'tab-active' : ''}`} onClick={() => setTab('exec')}>Execution</button>
        <button className={`tab ${tab === 'summary' ? 'tab-active' : ''}`} onClick={() => setTab('summary')}>Summary & Deploy</button>
      </div>

      {tab === 'code' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Source Files</h3>
            <button
              className={`btn btn-sm btn-primary ${sandboxStatus === 'pending' ? 'loading' : ''}`}
              onClick={handleRunSandbox}
              disabled={sandboxStatus === 'pending'}
            >
              {sandboxStatus === 'pending' ? 'Running in Sandbox...' : '▶ Run in Sandbox'}
            </button>
          </div>
          {sandboxStatus === 'pending' && (
            <div className="alert alert-info text-sm">
              Request sent to Zenfox. Live sandbox results will appear in this chat.
            </div>
          )}
          {run.generated_code.map((file) => (
            <div key={file.filename} className="card bg-base-200">
              <div className="card-body p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-sm font-bold">{file.filename}</h3>
                  <div className="flex gap-2">
                    <span className="badge badge-sm">{file.language}</span>
                    {editingFile !== file.filename ? (
                      <button className="btn btn-xs btn-ghost" onClick={() => startEdit(file)}>✏️ Edit</button>
                    ) : (
                      <div className="flex gap-1">
                        <button className="btn btn-xs btn-success" onClick={saveEdit}>Save</button>
                        <button className="btn btn-xs btn-ghost" onClick={cancelEdit}>Cancel</button>
                      </div>
                    )}
                  </div>
                </div>
                {editingFile === file.filename ? (
                  <textarea
                    className="textarea textarea-bordered font-mono text-sm w-full mt-2 h-64 bg-base-300"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                ) : (
                  <pre className="bg-base-300 p-3 rounded-lg overflow-x-auto text-sm mt-2"><code>{file.content}</code></pre>
                )}
              </div>
            </div>
          ))}
          {run.generated_code.length === 0 && <div className="alert alert-info">No generated code files.</div>}
        </div>
      )}

      {tab === 'review' && (
        <div className="card bg-base-200">
          <div className="card-body space-y-4">
            <div className="flex items-center gap-3">
              <div className="radial-progress text-primary" style={{ '--value': run.review_report.quality_score } as React.CSSProperties}>{run.review_report.quality_score}%</div>
              <div>
                <div className="font-bold">Quality Score</div>
                <div className="text-sm opacity-70">
                  Overall:{' '}
                  <span className={`badge ${run.review_report.overall_status === 'pass' ? 'badge-success' : run.review_report.overall_status === 'warn' ? 'badge-warning' : 'badge-error'}`}>
                    {run.review_report.overall_status.toUpperCase()}
                  </span>
                </div>
                {typeof run.review_report.test_coverage === 'number' && (
                  <div className="text-sm opacity-70">Test Coverage: {run.review_report.test_coverage}%</div>
                )}
              </div>
            </div>

            {run.review_report.style_violations && run.review_report.style_violations.length > 0 && (
              <div>
                <h3 className="font-bold mb-2">Style Violations ({run.review_report.style_violations.length})</h3>
                <div className="bg-base-300 p-3 rounded-lg space-y-1 max-h-40 overflow-y-auto">
                  {run.review_report.style_violations.map((v, i) => (
                    <div key={i} className="text-sm font-mono opacity-90">• {v}</div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-bold mb-2">Security Issues ({run.review_report.security_issues.length})</h3>
              {run.review_report.security_issues.length === 0 && <p className="text-sm opacity-70">No issues found.</p>}
              <div className="space-y-2">
                {run.review_report.security_issues.map((issue, i) => (
                  <div key={i} className={`alert alert-sm ${issue.severity === 'critical' ? 'alert-error' : issue.severity === 'high' ? 'alert-warning' : 'alert-info'}`}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`badge badge-xs ${issue.severity === 'critical' ? 'badge-error' : issue.severity === 'high' ? 'badge-warning' : 'badge-info'}`}>{issue.severity}</span>
                        <span className="text-sm font-mono">{issue.file}:{issue.line}</span>
                      </div>
                      <p className="text-sm">{issue.description}</p>
                      {issue.cwe_id && <p className="text-xs opacity-70 font-mono">{issue.cwe_id}</p>}
                      {issue.remediation && <p className="text-xs opacity-80">Fix: {issue.remediation}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-2">Suggestions</h3>
              <ul className="list-disc list-inside text-sm space-y-1 opacity-90">
                {run.review_report.suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {tab === 'exec' && (
        <div className="card bg-base-200">
          <div className="card-body space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`badge ${run.execution_results.success ? 'badge-success' : 'badge-error'}`}>{run.execution_results.success ? 'SUCCESS' : 'FAILED'}</span>
                <span className="text-sm opacity-70">Duration: {(run.execution_results.duration_ms / 1000).toFixed(2)}s</span>
                {typeof run.execution_results.exit_code === 'number' && (
                  <span className="text-sm opacity-70">Exit: {run.execution_results.exit_code}</span>
                )}
              </div>
              <button
                className={`btn btn-sm btn-primary ${sandboxStatus === 'pending' ? 'loading' : ''}`}
                onClick={handleRunSandbox}
                disabled={sandboxStatus === 'pending'}
              >
                {sandboxStatus === 'pending' ? 'Running...' : '▶ Re-run in Sandbox'}
              </button>
            </div>
            {sandboxStatus === 'pending' && (
              <div className="alert alert-info text-sm">
                Request sent to Zenfox. Live sandbox results will appear in this chat.
              </div>
            )}
            <div className="bg-base-300 p-4 rounded-lg font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
              {run.execution_results.logs.map((log, i) => <div key={i} className="opacity-90">{log}</div>)}
              {run.execution_results.error_message && <div className="text-error">{run.execution_results.error_message}</div>}
            </div>
            {run.execution_results.artifacts && run.execution_results.artifacts.length > 0 && (
              <div>
                <h3 className="font-bold text-sm mb-1">Artifacts</h3>
                <div className="flex gap-2">
                  {run.execution_results.artifacts.map((a, i) => (
                    <span key={i} className="badge badge-sm badge-outline">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'summary' && (
        <div className="card bg-base-200">
          <div className="card-body space-y-4">
            <div>
              <h3 className="font-bold">Status</h3>
              <p className="text-lg">{run.summary.status}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-base-300 p-3 rounded text-center">
                <div className="text-2xl font-bold">{run.summary.files_generated}</div>
                <div className="opacity-70">Files Generated</div>
              </div>
              <div className="bg-base-300 p-3 rounded text-center">
                <div className="text-2xl font-bold">{run.summary.issues_found}</div>
                <div className="opacity-70">Issues Found</div>
              </div>
              <div className="bg-base-300 p-3 rounded text-center">
                <div className="text-2xl font-bold">{(run.summary.execution_time_ms / 1000).toFixed(1)}s</div>
                <div className="opacity-70">Execution Time</div>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-2">Next Steps</h3>
              <ul className="list-disc list-inside space-y-1">
                {run.summary.next_steps.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>

            <div className="divider" />

            <div>
              <h3 className="font-bold mb-2">Deployment</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-base-300 p-2 rounded">
                  Status:{' '}
                  <span className={`badge badge-sm ${run.deployment_info.status === 'deployed' ? 'badge-success' : run.deployment_info.status === 'failed' ? 'badge-error' : run.deployment_info.status === 'pending' ? 'badge-info' : 'badge-ghost'}`}>
                    {run.deployment_info.status}
                  </span>
                </div>
                <div className="bg-base-300 p-2 rounded">Branch: {run.deployment_info.branch}</div>
                {run.deployment_info.commit_sha && (
                  <div className="bg-base-300 p-2 rounded col-span-2 font-mono text-xs">Commit: {run.deployment_info.commit_sha}</div>
                )}
                {run.deployment_info.url && (
                  <div className="bg-base-300 p-2 rounded col-span-2">
                    <a href={run.deployment_info.url} className="link link-primary" target="_blank" rel="noreferrer">{run.deployment_info.url}</a>
                  </div>
                )}
                {run.deployment_info.deployed_at && (
                  <div className="bg-base-300 p-2 rounded col-span-2 text-xs opacity-70">Deployed: {new Date(run.deployment_info.deployed_at).toLocaleString()}</div>
                )}
                {run.deployment_info.error && (
                  <div className="bg-base-300 p-2 rounded col-span-2 text-error text-xs">Error: {run.deployment_info.error}</div>
                )}
              </div>
              <div className="mt-4">
                {run.inputs.repository_url ? (
                  <button
                    className={`btn btn-primary btn-sm ${deployStatus === 'pending' ? 'loading' : ''}`}
                    onClick={handleDeployGitHub}
                    disabled={deployStatus === 'pending'}
                  >
                    {deployStatus === 'pending' ? 'Pushing to GitHub...' : '⬆ Push to GitHub'}
                  </button>
                ) : (
                  <div className="alert alert-sm alert-warning">No repository URL configured. Set one in the task inputs to enable deployment.</div>
                )}
                {deployStatus === 'pending' && (
                  <div className="alert alert-info text-sm mt-2">
                    Request sent to Zenfox. Deployment progress will appear in this chat.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

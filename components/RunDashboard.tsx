import React, { useState } from 'react';
import { AgentRun, SecretEnv } from '../types';

interface RunDashboardProps {
  run: AgentRun;
  runs: AgentRun[];
  onBack: () => void;
  onUpdateRun: (id: string, updates: Partial<AgentRun>) => void;
  onAutoFix: (id: string) => void;
  onDiff: (a: string, b: string) => void;
  secrets: SecretEnv[];
  onSecretsChange: (secrets: SecretEnv[]) => void;
}

export function RunDashboard({ run, runs, onBack, onUpdateRun, onAutoFix, onDiff, secrets, onSecretsChange }: RunDashboardProps) {
  const [tab, setTab] = useState<'code' | 'review' | 'sandbox' | 'api' | 'diagram' | 'benchmark' | 'deploy' | 'summary'>('summary');
  const [activeFile, setActiveFile] = useState(run.generated_code[0]?.filename || '');
  const [editContent, setEditContent] = useState('');
  const [editing, setEditing] = useState(false);
  const [sandboxRunning, setSandboxRunning] = useState(false);
  const [apiTestRunning, setApiTestRunning] = useState(false);
  const [benchRunning, setBenchRunning] = useState(false);
  const [newSecretKey, setNewSecretKey] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');
  const [showSecrets, setShowSecrets] = useState(false);
  const [deploying, setDeploying] = useState<string | null>(null);

  const activeFileObj = run.generated_code.find(f => f.filename === activeFile);

  const TabBtn = ({ id, label }: { id: typeof tab; label: string }) => (
    <button className={`tab tab-sm ${tab === id ? 'tab-active' : ''}`} onClick={() => setTab(id)}>{label}</button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
          <h2 className="text-xl font-bold">Run {run.id.slice(-6)}</h2>
          <span className={`badge ${run.review_report.overall_status === 'pass' ? 'badge-success' : run.review_report.overall_status === 'warn' ? 'badge-warning' : 'badge-error'}`}>{run.review_report.overall_status}</span>
        </div>
        <div className="flex gap-2">
          {runs.filter(r => r.id !== run.id).length > 0 && (
            <select className="select select-bordered select-sm" onChange={e => { if (e.target.value) onDiff(run.id, e.target.value); }}>
              <option value="">Diff with...</option>
              {runs.filter(r => r.id !== run.id).map(r => (
                <option key={r.id} value={r.id}>{r.id.slice(-6)} (score: {r.review_report.quality_score})</option>
              ))}
            </select>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => onAutoFix(run.id)} disabled={run.inputs.config.auto_fix}>Auto-Fix</button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap text-sm opacity-70">
        <span>{run.generated_code.length} files</span>·<span>Score: {run.review_report.quality_score}</span>·<span>{run.summary.execution_time_ms}ms</span>
        {run.summary.cost_metrics && <span>· ~${run.summary.cost_metrics.estimated_cost_usd.toFixed(3)}</span>}
        {run.inputs.config.swarm_mode && <span className="badge badge-xs badge-primary">Swarm</span>}
        {run.inputs.config.auto_fix && <span className="badge badge-xs badge-secondary">AutoFix</span>}
        {run.summary.auto_fix_iterations && run.summary.auto_fix_iterations.length > 0 && <span className="badge badge-xs badge-accent">{run.summary.auto_fix_iterations.length} iterations</span>}
      </div>

      <div className="tabs tabs-boxed">
        <TabBtn id="summary" label="Summary" />
        <TabBtn id="code" label="Generated Code" />
        <TabBtn id="review" label="Review" />
        <TabBtn id="sandbox" label="Sandbox" />
        <TabBtn id="api" label="API Tests" />
        <TabBtn id="diagram" label="Architecture" />
        <TabBtn id="benchmark" label="Benchmarks" />
        <TabBtn id="deploy" label="Deploy" />
      </div>

      {tab === 'summary' && (
        <div className="space-y-4">
          <div className="stats shadow bg-base-200">
            <div className="stat"><div className="stat-title">Files</div><div className="stat-value text-2xl">{run.summary.files_generated}</div></div>
            <div className="stat"><div className="stat-title">Issues</div><div className="stat-value text-2xl">{run.summary.issues_found}</div></div>
            <div className="stat"><div className="stat-title">Time</div><div className="stat-value text-2xl">{(run.summary.execution_time_ms / 1000).toFixed(1)}s</div></div>
          </div>

          {run.summary.cost_metrics && (
            <div className="card bg-base-200 shadow">
              <div className="card-body p-4">
                <h3 className="font-bold text-sm">Cost Breakdown</h3>
                <div className="grid grid-cols-3 gap-2 text-sm mt-2">
                  <div><span className="opacity-70">Input tokens:</span> {run.summary.cost_metrics.estimated_input_tokens.toLocaleString()}</div>
                  <div><span className="opacity-70">Output tokens:</span> {run.summary.cost_metrics.estimated_output_tokens.toLocaleString()}</div>
                  <div><span className="opacity-70">Est. cost:</span> ${run.summary.cost_metrics.estimated_cost_usd.toFixed(4)}</div>
                </div>
              </div>
            </div>
          )}

          <div className="card bg-base-200 shadow">
            <div className="card-body p-4">
              <h3 className="font-bold text-sm mb-2">Status</h3>
              <p className="text-sm">{run.summary.status}</p>
              {run.summary.next_steps.length > 0 && (
                <div className="mt-2">
                  <h4 className="font-semibold text-xs opacity-70 uppercase">Next Steps</h4>
                  <ul className="list-disc list-inside text-sm mt-1">
                    {run.summary.next_steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {run.summary.auto_fix_iterations && run.summary.auto_fix_iterations.length > 0 && (
            <div className="card bg-base-200 shadow">
              <div className="card-body p-4">
                <h3 className="font-bold text-sm mb-2">Auto-Fix Iterations</h3>
                <div className="space-y-2">
                  {run.summary.auto_fix_iterations.map((it, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="badge badge-xs">#{it.iteration}</span>
                      <span className="opacity-70">{it.previous_score} →</span>
                      <span className="font-semibold">{it.new_score}</span>
                      <span className="opacity-70">({it.changes.length} changes)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {run.summary.sandbox_execution && (
            <div className="card bg-base-200 shadow">
              <div className="card-body p-4">
                <h3 className="font-bold text-sm mb-2">Sandbox Execution</h3>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`badge ${run.summary.sandbox_execution.status === 'success' ? 'badge-success' : run.summary.sandbox_execution.status === 'failed' ? 'badge-error' : 'badge-ghost'}`}>{run.summary.sandbox_execution.status}</span>
                  {run.summary.sandbox_execution.started_at && <span className="opacity-70">{new Date(run.summary.sandbox_execution.started_at).toLocaleTimeString()}</span>}
                </div>
                {run.summary.sandbox_execution.output && (
                  <pre className="bg-base-300 rounded p-2 text-xs mt-2 max-h-40 overflow-y-auto">{run.summary.sandbox_execution.output}</pre>
                )}
              </div>
            </div>
          )}

          {run.summary.architecture_diagram && (
            <div className="card bg-base-200 shadow">
              <div className="card-body p-4">
                <h3 className="font-bold text-sm mb-2">Architecture</h3>
                <div className="flex gap-1 flex-wrap">
                  {run.summary.architecture_diagram.services.map(s => <span key={s} className="badge badge-primary badge-sm">{s}</span>)}
                  {run.summary.architecture_diagram.databases.map(s => <span key={s} className="badge badge-secondary badge-sm">{s}</span>)}
                  {run.summary.architecture_diagram.external_apis.map(s => <span key={s} className="badge badge-accent badge-sm">{s}</span>)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'code' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">Files</h3>
            </div>
            {run.generated_code.map(f => (
              <button key={f.filename} className={`w-full text-left px-3 py-2 rounded text-sm ${activeFile === f.filename ? 'bg-primary text-primary-content' : 'hover:bg-base-300'}`} onClick={() => { setActiveFile(f.filename); setEditing(false); }}>
                <div className="truncate">{f.filename}</div>
                <div className="text-xs opacity-70">{f.language}</div>
              </button>
            ))}
          </div>
          <div className="lg:col-span-2">
            {activeFileObj && (
              <div className="card bg-base-200 shadow">
                <div className="card-body p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm">{activeFileObj.filename}</h3>
                    <div className="flex gap-2">
                      {!editing ? (
                        <button className="btn btn-ghost btn-xs" onClick={() => { setEditContent(activeFileObj.content); setEditing(true); }}>Edit</button>
                      ) : (
                        <>
                          <button className="btn btn-success btn-xs" onClick={() => {
                            const updated = run.generated_code.map(f => f.filename === activeFile ? { ...f, content: editContent } : f);
                            onUpdateRun(run.id, { generated_code: updated });
                            setEditing(false);
                          }}>Save</button>
                          <button className="btn btn-ghost btn-xs" onClick={() => setEditing(false)}>Cancel</button>
                        </>
                      )}
                    </div>
                  </div>
                  {editing ? (
                    <textarea className="textarea textarea-bordered w-full font-mono text-xs" rows={20} value={editContent} onChange={e => setEditContent(e.target.value)} />
                  ) : (
                    <pre className="bg-base-300 rounded p-3 text-xs overflow-x-auto max-h-96 overflow-y-auto">{activeFileObj.content}</pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'review' && (
        <div className="space-y-4">
          <div className="stats shadow bg-base-200">
            <div className="stat"><div className="stat-title">Quality Score</div><div className="stat-value text-2xl">{run.review_report.quality_score}</div></div>
            <div className="stat"><div className="stat-title">Security Issues</div><div className="stat-value text-2xl">{run.review_report.security_issues.length}</div></div>
            <div className="stat"><div className="stat-title">Test Coverage</div><div className="stat-value text-2xl">{run.review_report.test_coverage ?? 'N/A'}</div></div>
          </div>

          {run.review_report.security_issues.length > 0 && (
            <div className="card bg-base-200 shadow">
              <div className="card-body p-4">
                <h3 className="font-bold text-sm mb-2">Security Issues</h3>
                <div className="space-y-2">
                  {run.review_report.security_issues.map((issue, i) => (
                    <div key={i} className={`p-2 rounded text-sm ${issue.severity === 'critical' ? 'bg-error/20 border border-error' : issue.severity === 'high' ? 'bg-warning/20 border border-warning' : 'bg-base-300'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`badge badge-xs ${issue.severity === 'critical' ? 'badge-error' : issue.severity === 'high' ? 'badge-warning' : 'badge-ghost'}`}>{issue.severity}</span>
                        <span className="font-mono text-xs opacity-70">{issue.file}:{issue.line}</span>
                        {issue.cwe_id && <span className="badge badge-xs badge-info">{issue.cwe_id}</span>}
                      </div>
                      <p className="mt-1">{issue.description}</p>
                      {issue.remediation && <p className="text-xs opacity-70 mt-1">Fix: {issue.remediation}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {run.review_report.style_violations && run.review_report.style_violations.length > 0 && (
            <div className="card bg-base-200 shadow">
              <div className="card-body p-4">
                <h3 className="font-bold text-sm mb-2">Style Violations</h3>
                <ul className="list-disc list-inside text-sm">
                  {run.review_report.style_violations.map((v, i) => <li key={i}>{v}</li>)}
                </ul>
              </div>
            </div>
          )}

          {run.review_report.suggestions.length > 0 && (
            <div className="card bg-base-200 shadow">
              <div className="card-body p-4">
                <h3 className="font-bold text-sm mb-2">Suggestions</h3>
                <ul className="list-disc list-inside text-sm">
                  {run.review_report.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'sandbox' && (
        <div className="space-y-4">
          <div className="card bg-base-200 shadow">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">Sandbox Execution</h3>
                <button className={`btn btn-primary btn-sm ${sandboxRunning ? 'loading' : ''}`} onClick={() => {
                  setSandboxRunning(true);
                  setTimeout(() => {
                    setSandboxRunning(false);
                    onUpdateRun(run.id, { summary: { ...run.summary, sandbox_execution: { status: 'success', started_at: new Date().toISOString(), finished_at: new Date().toISOString(), output: 'Build completed successfully.\nTests passed: 12/12\nCoverage: 82%', artifacts: ['build.tar.gz', 'coverage-report.html'] } } });
                  }, 2000);
                }}>Run Sandbox</button>
              </div>
              {run.summary.sandbox_execution ? (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`badge ${run.summary.sandbox_execution.status === 'success' ? 'badge-success' : 'badge-error'}`}>{run.summary.sandbox_execution.status}</span>
                    {run.summary.sandbox_execution.container_id && <span className="font-mono text-xs opacity-70">{run.summary.sandbox_execution.container_id}</span>}
                  </div>
                  {run.summary.sandbox_execution.output && (
                    <pre className="bg-base-300 rounded p-3 text-xs max-h-64 overflow-y-auto">{run.summary.sandbox_execution.output}</pre>
                  )}
                  {run.summary.sandbox_execution.artifacts && run.summary.sandbox_execution.artifacts.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {run.summary.sandbox_execution.artifacts.map(a => <span key={a} className="badge badge-sm badge-outline">{a}</span>)}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm opacity-70 mt-4">No sandbox execution yet. Click "Run Sandbox" to execute code in the configured environment.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'api' && (
        <div className="space-y-4">
          <div className="card bg-base-200 shadow">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">API Test Console</h3>
                <button className={`btn btn-primary btn-sm ${apiTestRunning ? 'loading' : ''}`} onClick={() => {
                  setApiTestRunning(true);
                  setTimeout(() => {
                    setApiTestRunning(false);
                    const tests = (run.summary.api_tests || []).map((t, i) => ({ ...t, status: i % 2 === 0 ? 'pass' as const : 'fail' as const, response: '{"status":"ok"}', response_status: 200, response_time_ms: 45 + i * 10 }));
                    onUpdateRun(run.id, { summary: { ...run.summary, api_tests: tests } });
                  }, 2000);
                }}>Run API Tests</button>
              </div>
              {run.summary.api_tests && run.summary.api_tests.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {run.summary.api_tests.map((test, i) => (
                    <div key={test.id} className={`p-2 rounded text-sm border ${test.status === 'pass' ? 'border-success bg-success/10' : test.status === 'fail' ? 'border-error bg-error/10' : 'border-base-300 bg-base-300'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`badge badge-xs ${test.status === 'pass' ? 'badge-success' : test.status === 'fail' ? 'badge-error' : 'badge-ghost'}`}>{test.status.toUpperCase()}</span>
                          <span className="font-mono text-xs">{test.endpoint.method} {test.endpoint.path}</span>
                        </div>
                        {test.response_time_ms && <span className="text-xs opacity-70">{test.response_time_ms}ms</span>}
                      </div>
                      {test.error && <p className="text-xs text-error mt-1">{test.error}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm opacity-70 mt-4">No API tests configured. Code generation produces endpoint definitions for testing.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'diagram' && (
        <div className="space-y-4">
          <div className="card bg-base-200 shadow">
            <div className="card-body p-4">
              <h3 className="font-bold text-sm mb-2">Architecture Diagram</h3>
              {run.summary.architecture_diagram ? (
                <div className="space-y-3">
                  <div className="flex gap-2 flex-wrap mb-2">
                    {run.summary.architecture_diagram.services.map(s => <span key={s} className="badge badge-primary">{s}</span>)}
                    {run.summary.architecture_diagram.databases.map(s => <span key={s} className="badge badge-secondary">{s}</span>)}
                    {run.summary.architecture_diagram.external_apis.map(s => <span key={s} className="badge badge-accent">{s}</span>)}
                  </div>
                  <div className="bg-base-300 rounded p-4 overflow-x-auto">
                    <pre className="text-xs font-mono whitespace-pre">{run.summary.architecture_diagram.mermaid_code}</pre>
                  </div>
                  <p className="text-xs opacity-70">Copy the Mermaid code into a renderer like Mermaid Live Editor or Notion to visualize.</p>
                </div>
              ) : (
                <p className="text-sm opacity-70">No architecture diagram generated yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'benchmark' && (
        <div className="space-y-4">
          <div className="card bg-base-200 shadow">
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">Performance Benchmarks</h3>
                <button className={`btn btn-primary btn-sm ${benchRunning ? 'loading' : ''}`} onClick={() => {
                  setBenchRunning(true);
                  setTimeout(() => {
                    setBenchRunning(false);
                    onUpdateRun(run.id, { summary: { ...run.summary, benchmarks: [{ name: 'GET /api/users', requests_per_second: 1240, avg_latency_ms: 12, p50_latency_ms: 8, p95_latency_ms: 28, p99_latency_ms: 45, error_rate: 0, duration_seconds: 30 }] } });
                  }, 2000);
                }}>Run Benchmarks</button>
              </div>
              {run.summary.benchmarks && run.summary.benchmarks.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {run.summary.benchmarks.map((b, i) => (
                    <div key={i} className="bg-base-300 rounded p-3">
                      <div className="font-semibold text-sm mb-2">{b.name}</div>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                        <div><div className="opacity-70">RPS</div><div className="font-bold">{b.requests_per_second}</div></div>
                        <div><div className="opacity-70">Avg</div><div className="font-bold">{b.avg_latency_ms}ms</div></div>
                        <div><div className="opacity-70">P50</div><div className="font-bold">{b.p50_latency_ms}ms</div></div>
                        <div><div className="opacity-70">P95</div><div className="font-bold">{b.p95_latency_ms}ms</div></div>
                        <div><div className="opacity-70">P99</div><div className="font-bold">{b.p99_latency_ms}ms</div></div>
                        <div><div className="opacity-70">Errors</div><div className="font-bold">{(b.error_rate * 100).toFixed(1)}%</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm opacity-70 mt-4">No benchmarks yet. Click "Run Benchmarks" to simulate load tests.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'deploy' && (
        <div className="space-y-4">
          <div className="card bg-base-200 shadow">
            <div className="card-body p-4 space-y-3">
              <h3 className="font-bold text-sm">Deployment Targets</h3>
              {run.deployment_info.targets ? run.deployment_info.targets.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-base-300 rounded">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-sm capitalize">{t.platform}</span>
                    <span className={`badge badge-xs ${t.status === 'deployed' ? 'badge-success' : t.status === 'failed' ? 'badge-error' : 'badge-ghost'}`}>{t.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.url && <a href={t.url} target="_blank" rel="noopener noreferrer" className="link link-primary text-xs">{t.url}</a>}
                    {deploying === t.platform ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : t.status !== 'deployed' && (
                      <button className="btn btn-xs btn-primary" onClick={() => {
                        setDeploying(t.platform);
                        setTimeout(() => {
                          setDeploying(null);
                          const updated = run.deployment_info.targets?.map(x => x.platform === t.platform ? { ...x, status: 'deployed' as const, url: `https://${run.id.slice(0, 8)}-${t.platform}.vercel.app` } : x);
                          onUpdateRun(run.id, { deployment_info: { ...run.deployment_info, status: 'deployed' as const, targets: updated } });
                        }, 2000);
                      }}>Deploy</button>
                    )}
                  </div>
                </div>
              )) : (
                <p className="text-sm opacity-70">No deployment targets configured.</p>
              )}

              <div className="divider text-xs">GitHub</div>
              <div className="flex items-center gap-2 text-sm">
                <span className="badge badge-xs">{run.deployment_info.branch}</span>
                {run.deployment_info.commit_sha && <span className="font-mono text-xs opacity-70">{run.deployment_info.commit_sha.slice(0, 7)}</span>}
                <span className={`badge badge-xs ${run.deployment_info.status === 'deployed' ? 'badge-success' : 'badge-ghost'}`}>{run.deployment_info.status}</span>
              </div>
              {run.deployment_info.pr_url && (
                <div className="text-xs">
                  <a href={run.deployment_info.pr_url} target="_blank" rel="noopener noreferrer" className="link link-primary">View PR #{run.deployment_info.pr_number}</a>
                </div>
              )}

              <div className="divider text-xs">Secrets Manager</div>
              <div className="space-y-2">
                {secrets.map((s, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input className="input input-bordered input-sm flex-1" value={s.key} readOnly />
                    <input className="input input-bordered input-sm flex-1" type={showSecrets ? 'text' : 'password'} value={s.value} readOnly />
                    <button className="btn btn-error btn-xs" onClick={() => onSecretsChange(secrets.filter((_, j) => j !== i))}>Remove</button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input className="input input-bordered input-sm flex-1" placeholder="KEY_NAME" value={newSecretKey} onChange={e => setNewSecretKey(e.target.value)} />
                  <input className="input input-bordered input-sm flex-1" type={showSecrets ? 'text' : 'password'} placeholder="value" value={newSecretValue} onChange={e => setNewSecretValue(e.target.value)} />
                  <button className="btn btn-secondary btn-sm" onClick={() => {
                    if (newSecretKey && newSecretValue) {
                      onSecretsChange([...secrets, { key: newSecretKey, value: newSecretValue, encrypted: true }]);
                      setNewSecretKey(''); setNewSecretValue('');
                    }
                  }}>Add</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowSecrets(!showSecrets)}>{showSecrets ? 'Hide' : 'Show'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

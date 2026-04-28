import React, { useState } from 'react';
import { AgentRun, SourceFile } from '../types';

interface Props {
  run: AgentRun;
  runs: AgentRun[];
  onBack: () => void;
  onUpdateRun?: (run: AgentRun) => void;
  onAutoFix?: (run: AgentRun) => void;
  onDiff?: (a: AgentRun, b: AgentRun) => void;
}

export function RunDashboard({ run, runs, onBack, onUpdateRun, onAutoFix, onDiff }: Props) {
  const [tab, setTab] = useState<'code' | 'review' | 'exec' | 'summary'>('code');
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [sandboxStatus, setSandboxStatus] = useState<'idle' | 'pending' | 'done'>('idle');
  const [deployStatuses, setDeployStatuses] = useState<Record<string, 'idle' | 'pending' | 'done'>>({});
  const [showDiffPicker, setShowDiffPicker] = useState(false);

  const startEdit = (file: SourceFile) => {
    setEditingFile(file.filename);
    setEditContent(file.content);
  };

  const cancelEdit = () => { setEditingFile(null); setEditContent(''); };

  const saveEdit = () => {
    if (!editingFile || !onUpdateRun) return;
    const updatedFiles = run.generated_code.map(f => f.filename === editingFile ? { ...f, content: editContent } : f);
    onUpdateRun({ ...run, generated_code: updatedFiles });
    setEditingFile(null);
    setEditContent('');
  };

  const handleRunSandbox = () => {
    setSandboxStatus('pending');
    window.zenfox?.emitEvent('run_sandbox', {
      runId: run.id,
      files: run.generated_code.map(f => ({ filename: f.filename, content: f.content })),
      stack: run.inputs.target_stack,
      environment: run.inputs.execution_environment,
      config: run.inputs.config,
    });
    setTimeout(() => setSandboxStatus('done'), 2000);
  };

  const handleDeploy = (platform: string) => {
    setDeployStatuses(prev => ({ ...prev, [platform]: 'pending' }));
    const eventType = platform === 'github' ? 'deploy_github' : `deploy_${platform}`;
    window.zenfox?.emitEvent(eventType, {
      runId: run.id,
      repoUrl: run.inputs.repository_url,
      files: run.generated_code.map(f => ({ filename: f.filename, content: f.content })),
      branch: run.deployment_info.branch || 'main',
      config: run.inputs.config,
      platform,
    });
    setTimeout(() => setDeployStatuses(prev => ({ ...prev, [platform]: 'done' })), 2000);
  };

  const cost = run.summary.cost_metrics;
  const hasAutoFix = !!run.summary.auto_fix_iterations && run.summary.auto_fix_iterations.length > 0;
  const swarmAgents = run.summary.swarm_agents;

  const inputSummary = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-4">
      <div className="bg-base-300 p-2 rounded"><div className="opacity-60">Stack</div><div className="font-semibold truncate">{run.inputs.target_stack || '—'}</div></div>
      <div className="bg-base-300 p-2 rounded"><div className="opacity-60">Docker</div><div className="font-semibold truncate">{run.inputs.execution_environment.docker_image || '—'}</div></div>
      <div className="bg-base-300 p-2 rounded"><div className="opacity-60">Style</div><div className="font-semibold">{run.inputs.config.coding_style || '—'}</div></div>
      <div className="bg-base-300 p-2 rounded"><div className="opacity-60">Tests</div><div className="font-semibold">{run.inputs.config.test_preferences?.framework || '—'}</div></div>
    </div>
  );

  const costCard = cost && (
    <div className="card bg-base-300 mb-4">
      <div className="card-body p-3">
        <h3 className="text-sm font-bold mb-2">Cost Breakdown</h3>
        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          <div><div className="font-bold text-primary">{cost.estimated_input_tokens.toLocaleString()}</div><div className="opacity-60">Input tokens</div></div>
          <div><div className="font-bold text-primary">{cost.estimated_output_tokens.toLocaleString()}</div><div className="opacity-60">Output tokens</div></div>
          <div><div className="font-bold text-success">~${cost.estimated_cost_usd.toFixed(4)}</div><div className="opacity-60">Est. cost</div></div>
        </div>
      </div>
    </div>
  );

  const swarmBadge = swarmAgents && (
    <div className="badge badge-accent badge-sm mb-2">Swarm: {swarmAgents.join(', ')}</div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button className="btn btn-sm btn-ghost" onClick={onBack}>← Back</button>
        <h2 className="text-xl font-bold">Run {run.id}</h2>
        <span className={`badge badge-sm ${run.execution_results.success ? 'badge-success' : 'badge-error'}`}>
          {run.execution_results.success ? 'Success' : 'Failed'}
        </span>
        {swarmBadge}
        {hasAutoFix && <span className="badge badge-warning badge-sm">Auto-fixed ×{run.summary.auto_fix_iterations!.length}</span>}
        <div className="flex-1" />
        {onAutoFix && !run.execution_results.success && (
          <button className="btn btn-sm btn-warning" onClick={() => onAutoFix(run)}>Auto-Fix</button>
        )}
        {onDiff && (
          <div className="relative">
            <button className="btn btn-sm btn-secondary" onClick={() => setShowDiffPicker(!showDiffPicker)}>Diff with...</button>
            {showDiffPicker && (
              <div className="absolute right-0 top-full mt-1 bg-base-200 shadow-xl rounded-lg p-2 z-10 w-64 max-h-48 overflow-auto">
                <p className="text-xs opacity-70 mb-1">Select run to compare:</p>
                {runs.filter(r => r.id !== run.id).map(r => (
                  <button key={r.id} className="btn btn-xs btn-ghost w-full text-left mb-1" onClick={() => { onDiff(run, r); setShowDiffPicker(false); }}>
                    {r.id} (Score: {r.review_report.quality_score})
                  </button>
                ))}
                {runs.filter(r => r.id !== run.id).length === 0 && <p className="text-xs opacity-50">No other runs</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {inputSummary}
      {costCard}

      <div className="tabs tabs-boxed">
        <button className={`tab ${tab === 'code' ? 'tab-active' : ''}`} onClick={() => setTab('code')}>Code ({run.generated_code.length})</button>
        <button className={`tab ${tab === 'review' ? 'tab-active' : ''}`} onClick={() => setTab('review')}>Review</button>
        <button className={`tab ${tab === 'exec' ? 'tab-active' : ''}`} onClick={() => setTab('exec')}>Execution</button>
        <button className={`tab ${tab === 'summary' ? 'tab-active' : ''}`} onClick={() => setTab('summary')}>Summary</button>
      </div>

      {tab === 'code' && (
        <div className="space-y-4">
          {run.generated_code.length === 0 ? (
            <div className="alert alert-warning">No code generated.</div>
          ) : (
            run.generated_code.map(file => (
              <div key={file.filename} className="card bg-base-200 shadow">
                <div className="card-body p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm">{file.filename}</h3>
                    <div className="flex gap-1">
                      {editingFile === file.filename ? (
                        <>
                          <button className="btn btn-xs btn-success" onClick={saveEdit}>Save</button>
                          <button className="btn btn-xs btn-ghost" onClick={cancelEdit}>Cancel</button>
                        </>
                      ) : (
                        <button className="btn btn-xs btn-ghost" onClick={() => startEdit(file)}>Edit</button>
                      )}
                    </div>
                  </div>
                  {editingFile === file.filename ? (
                    <textarea className="textarea textarea-bordered font-mono text-xs w-full h-64" value={editContent} onChange={e => setEditContent(e.target.value)} />
                  ) : (
                    <pre className="bg-base-300 rounded p-3 overflow-x-auto text-xs max-h-64"><code>{file.content}</code></pre>
                  )}
                </div>
              </div>
            ))
          )}
          <div className="flex gap-2 flex-wrap">
            <button className="btn btn-primary btn-sm" onClick={handleRunSandbox} disabled={sandboxStatus !== 'idle'}>
              {sandboxStatus === 'pending' ? <span className="loading loading-spinner loading-xs" /> : sandboxStatus === 'done' ? '✓ Sandbox Ran' : 'Run in Sandbox'}
            </button>
            {(run.inputs.config.deployment_targets || ['github']).map(platform => (
              <button key={platform} className="btn btn-secondary btn-sm capitalize" onClick={() => handleDeploy(platform)} disabled={deployStatuses[platform] !== 'idle' && deployStatuses[platform] !== undefined}>
                {deployStatuses[platform] === 'pending' ? <span className="loading loading-spinner loading-xs" /> : deployStatuses[platform] === 'done' ? `✓ ${platform}` : `Push to ${platform}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'review' && (
        <div className="space-y-4">
          <div className="card bg-base-200 shadow">
            <div className="card-body p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`radial-progress text-xl ${run.review_report.overall_status === 'pass' ? 'text-success' : run.review_report.overall_status === 'warn' ? 'text-warning' : 'text-error'}`} style={{ '--value': run.review_report.quality_score } as any}>
                  {run.review_report.quality_score}
                </div>
                <div>
                  <h3 className="font-bold">Quality Score</h3>
                  <p className="text-sm opacity-70">{run.review_report.overall_status.toUpperCase()}</p>
                </div>
              </div>
              <div className="stats shadow">
                <div className="stat"><div className="stat-title">Issues</div><div className="stat-value text-sm">{run.review_report.security_issues.length}</div></div>
                <div className="stat"><div className="stat-title">Style Violations</div><div className="stat-value text-sm">{run.review_report.style_violations?.length || 0}</div></div>
                <div className="stat"><div className="stat-title">Test Coverage</div><div className="stat-value text-sm">{run.review_report.test_coverage ?? 0}%</div></div>
              </div>
            </div>
          </div>

          {hasAutoFix && (
            <div className="card bg-base-200 shadow">
              <div className="card-body p-4">
                <h3 className="font-bold text-sm mb-2">Auto-Fix Iterations</h3>
                <div className="space-y-2">
                  {run.summary.auto_fix_iterations!.map(iter => (
                    <div key={iter.iteration} className="flex items-center gap-2 text-sm">
                      <span className="badge badge-sm">#{iter.iteration}</span>
                      <span className="opacity-70">{iter.previous_score} →</span>
                      <span className="font-bold text-success">{iter.new_score}</span>
                      <span className="text-xs opacity-50">({iter.changes.length} changes)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {run.review_report.security_issues.length > 0 && (
            <div className="card bg-base-200 shadow">
              <div className="card-body p-4">
                <h3 className="font-bold text-sm mb-2">Security Issues</h3>
                <div className="space-y-2">
                  {run.review_report.security_issues.map((issue, i) => (
                    <div key={i} className={`alert alert-${issue.severity === 'critical' ? 'error' : issue.severity === 'high' ? 'warning' : 'info'} p-2 text-sm`}>
                      <div className="flex items-start gap-2">
                        <span className="badge badge-sm badge-outline">{issue.severity}</span>
                        <div className="flex-1">
                          <p className="font-semibold">{issue.file}:{issue.line}</p>
                          <p>{issue.description}</p>
                          {issue.cwe_id && <p className="text-xs opacity-70">CWE: {issue.cwe_id}</p>}
                          {issue.remediation && <p className="text-xs mt-1">Fix: {issue.remediation}</p>}
                        </div>
                      </div>
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
                <ul className="list-disc list-inside text-sm space-y-1">
                  {run.review_report.style_violations.map((v, i) => <li key={i} className="opacity-80">{v}</li>)}
                </ul>
              </div>
            </div>
          )}

          {run.review_report.suggestions.length > 0 && (
            <div className="card bg-base-200 shadow">
              <div className="card-body p-4">
                <h3 className="font-bold text-sm mb-2">Suggestions</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {run.review_report.suggestions.map((s, i) => <li key={i} className="opacity-80">{s}</li>)}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'exec' && (
        <div className="space-y-4">
          <div className="card bg-base-200 shadow">
            <div className="card-body p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`radial-progress text-xl ${run.execution_results.success ? 'text-success' : 'text-error'}`} style={{ '--value': run.execution_results.success ? 100 : 0 } as any}>
                  {run.execution_results.success ? '✓' : '✗'}
                </div>
                <div>
                  <h3 className="font-bold">Execution</h3>
                  <p className="text-sm opacity-70">{run.execution_results.success ? 'Success' : 'Failed'}</p>
                </div>
                <div className="flex-1" />
                <div className="text-xs text-right opacity-70">
                  <div>Exit: {run.execution_results.exit_code ?? '—'}</div>
                  <div>{run.execution_results.duration_ms}ms</div>
                </div>
              </div>

              <div className="bg-base-300 rounded p-3 font-mono text-xs max-h-64 overflow-y-auto">
                {run.execution_results.logs.map((log, i) => (
                  <div key={i} className={log.includes('failed') || log.includes('error') ? 'text-error' : log.includes('success') || log.includes('passed') ? 'text-success' : ''}>
                    {log}
                  </div>
                ))}
              </div>

              {run.execution_results.error_message && (
                <div className="alert alert-error mt-3 text-sm">{run.execution_results.error_message}</div>
              )}
            </div>
          </div>

          {run.execution_results.artifacts && run.execution_results.artifacts.length > 0 && (
            <div className="card bg-base-200 shadow">
              <div className="card-body p-4">
                <h3 className="font-bold text-sm mb-2">Artifacts</h3>
                <div className="flex flex-wrap gap-2">
                  {run.execution_results.artifacts.map((a, i) => <span key={i} className="badge badge-outline badge-sm">{a}</span>)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'summary' && (
        <div className="space-y-4">
          <div className="card bg-base-200 shadow">
            <div className="card-body p-4">
              <h3 className="font-bold text-lg mb-2">{run.summary.status}</h3>
              <div className="stats shadow mb-4">
                <div className="stat"><div className="stat-title">Files</div><div className="stat-value text-sm">{run.summary.files_generated}</div></div>
                <div className="stat"><div className="stat-title">Issues</div><div className="stat-value text-sm">{run.summary.issues_found}</div></div>
                <div className="stat"><div className="stat-title">Time</div><div className="stat-value text-sm">{(run.summary.execution_time_ms / 1000).toFixed(1)}s</div></div>
              </div>

              {cost && (
                <div className="stats shadow mb-4">
                  <div className="stat"><div className="stat-title">Tokens</div><div className="stat-value text-sm">{(cost.estimated_input_tokens + cost.estimated_output_tokens).toLocaleString()}</div></div>
                  <div className="stat"><div className="stat-title">Cost</div><div className="stat-value text-sm text-success">${cost.estimated_cost_usd.toFixed(4)}</div></div>
                </div>
              )}

              <h4 className="font-bold text-sm mb-2">Next Steps</h4>
              <ul className="list-disc list-inside text-sm space-y-1 opacity-80">
                {run.summary.next_steps.map((step, i) => <li key={i}>{step}</li>)}
              </ul>
            </div>
          </div>

          <div className="card bg-base-200 shadow">
            <div className="card-body p-4">
              <h3 className="font-bold text-sm mb-2">Deployment</h3>
              {run.deployment_info.targets && run.deployment_info.targets.length > 0 ? (
                <div className="space-y-2">
                  {run.deployment_info.targets.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="badge badge-sm capitalize">{t.platform}</span>
                      <span className={`${t.status === 'deployed' ? 'text-success' : t.status === 'failed' ? 'text-error' : 'opacity-70'}`}>
                        {t.status}
                      </span>
                      {t.url && <a href={t.url} target="_blank" rel="noreferrer" className="link link-primary link-hover text-xs">{t.url}</a>}
                      {t.error && <span className="text-xs text-error">{t.error}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm opacity-70">
                  <p>Status: <span className={`badge badge-sm ${run.deployment_info.status === 'deployed' ? 'badge-success' : run.deployment_info.status === 'failed' ? 'badge-error' : 'badge-ghost'}`}>{run.deployment_info.status}</span></p>
                  {run.deployment_info.commit_sha && <p className="mt-1">Commit: <code className="text-xs">{run.deployment_info.commit_sha}</code></p>}
                  {run.deployment_info.url && <p className="mt-1">URL: <a href={run.deployment_info.url} target="_blank" rel="noreferrer" className="link link-primary link-hover">{run.deployment_info.url}</a></p>}
                  {run.deployment_info.error && <p className="mt-1 text-error text-xs">{run.deployment_info.error}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

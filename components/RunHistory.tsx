import React from 'react';
import { AgentRun, AgentThread } from '../types';

interface RunHistoryProps {
  threads: AgentThread[];
  onSelectRun: (run: AgentRun) => void;
  onDiff: (a: string, b: string) => void;
  onDeleteRun: (id: string) => void;
}

export function RunHistory({ threads, onSelectRun, onDiff, onDeleteRun }: RunHistoryProps) {
  const [filter, setFilter] = React.useState('');
  const [diffMode, setDiffMode] = React.useState(false);
  const [diffSelection, setDiffSelection] = React.useState<string[]>([]);

  const allRuns = threads.flatMap(t => t.runs.map(r => ({ ...r, threadTitle: t.title })));
  const filtered = filter
    ? allRuns.filter(r => r.task_description.toLowerCase().includes(filter.toLowerCase()) || r.inputs.target_stack.toLowerCase().includes(filter.toLowerCase()))
    : allRuns;

  const toggleDiff = (id: string) => {
    if (diffSelection.includes(id)) {
      setDiffSelection(diffSelection.filter(x => x !== id));
    } else if (diffSelection.length < 2) {
      setDiffSelection([...diffSelection, id]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Run History ({filtered.length})</h2>
        <div className="flex gap-2">
          <input className="input input-bordered input-sm" placeholder="Filter runs..." value={filter} onChange={e => setFilter(e.target.value)} />
          <button className={`btn btn-sm ${diffMode ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setDiffMode(!diffMode); setDiffSelection([]); }}>
            {diffMode ? 'Exit Diff' : 'Diff Mode'}
          </button>
        </div>
      </div>

      {diffMode && diffSelection.length === 2 && (
        <button className="btn btn-primary btn-sm" onClick={() => onDiff(diffSelection[0], diffSelection[1])}>Compare Selected</button>
      )}

      {filtered.length === 0 ? (
        <div className="card bg-base-200 shadow"><div className="card-body items-center text-center"><p className="opacity-70">No runs found.</p></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(run => (
            <div key={run.id} className={`card bg-base-200 shadow hover:bg-base-300 transition-colors ${diffMode ? 'cursor-pointer' : ''} ${diffSelection.includes(run.id) ? 'ring-2 ring-primary' : ''}`}
              onClick={() => diffMode ? toggleDiff(run.id) : onSelectRun(run)}>
              <div className="card-body p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs opacity-70">{run.id.slice(-6)}</span>
                  <span className={`badge badge-xs ${run.review_report.overall_status === 'pass' ? 'badge-success' : run.review_report.overall_status === 'warn' ? 'badge-warning' : 'badge-error'}`}>{run.review_report.overall_status}</span>
                </div>
                <div className="text-sm font-semibold mt-1 truncate">{run.inputs.task_description.slice(0, 60)}{run.inputs.task_description.length > 60 ? '...' : ''}</div>
                <div className="text-xs opacity-70 mt-1">{run.inputs.target_stack}</div>
                <div className="text-xs opacity-50 mt-1">{new Date(run.created_at).toLocaleString()} · {(run as any).threadTitle}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-1 flex-wrap">
                    {run.inputs.config.swarm_mode && <span className="badge badge-xs badge-primary">Swarm</span>}
                    {run.inputs.config.auto_fix && <span className="badge badge-xs badge-secondary">AutoFix</span>}
                    {run.summary.auto_fix_iterations && run.summary.auto_fix_iterations.length > 0 && <span className="badge badge-xs badge-accent">{run.summary.auto_fix_iterations.length}×</span>}
                    {run.inputs.config.template_id && <span className="badge badge-xs badge-info">Template</span>}
                    {run.summary.sandbox_execution && <span className="badge badge-xs badge-success">Sandbox</span>}
                  </div>
                  {!diffMode && (
                    <button className="btn btn-ghost btn-xs text-error" onClick={e => { e.stopPropagation(); onDeleteRun(run.id); }}>Delete</button>
                  )}
                </div>
                {run.summary.cost_metrics && (
                  <div className="text-xs opacity-50 mt-1">~${run.summary.cost_metrics.estimated_cost_usd.toFixed(3)} · {run.summary.execution_time_ms}ms</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

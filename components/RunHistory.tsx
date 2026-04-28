import React, { useState } from 'react';
import { AgentRun } from '../types';

interface Props {
  runs: AgentRun[];
  onSelect: (run: AgentRun) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onDiff?: (a: AgentRun, b: AgentRun) => void;
}

export function RunHistory({ runs, onSelect, onDelete, onNew, onDiff }: Props) {
  const [diffMode, setDiffMode] = useState(false);
  const [diffSelection, setDiffSelection] = useState<string[]>([]);

  const toggleDiff = (id: string) => {
    setDiffSelection(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const startDiff = () => {
    if (diffSelection.length !== 2 || !onDiff) return;
    const a = runs.find(r => r.id === diffSelection[0]);
    const b = runs.find(r => r.id === diffSelection[1]);
    if (a && b) { onDiff(a, b); setDiffMode(false); setDiffSelection([]); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Run History ({runs.length})</h2>
        <div className="flex gap-2">
          {onDiff && (
            <button className={`btn btn-sm ${diffMode ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setDiffMode(!diffMode); setDiffSelection([]); }}>
              {diffMode ? 'Cancel Diff' : 'Diff Runs'}
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={onNew}>+ New Run</button>
        </div>
      </div>

      {diffMode && diffSelection.length === 2 && (
        <div className="alert alert-info text-sm flex justify-between items-center">
          <span>Selected: {diffSelection.join(' ↔ ')}</span>
          <button className="btn btn-sm btn-primary" onClick={startDiff}>Compare</button>
        </div>
      )}

      {runs.length === 0 ? (
        <div className="card bg-base-200 shadow">
          <div className="card-body items-center text-center">
            <p className="opacity-70 mb-4">No runs yet. Create your first coding agent run.</p>
            <button className="btn btn-primary" onClick={onNew}>New Run</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map(run => (
            <div key={run.id} className={`card bg-base-200 shadow hover:bg-base-300 transition-colors ${diffMode && diffSelection.includes(run.id) ? 'ring-2 ring-primary' : ''}`}>
              <div className="card-body p-4 flex flex-row items-center justify-between">
                <div className="flex-1 cursor-pointer" onClick={() => diffMode ? toggleDiff(run.id) : onSelect(run)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge badge-sm ${run.execution_results.success ? 'badge-success' : 'badge-error'}`}>
                      {run.execution_results.success ? 'Success' : 'Failed'}
                    </span>
                    {run.summary.swarm_agents && <span className="badge badge-sm badge-accent">Swarm</span>}
                    {run.summary.auto_fix_iterations && run.summary.auto_fix_iterations.length > 0 && (
                      <span className="badge badge-sm badge-warning">Auto-fix ×{run.summary.auto_fix_iterations.length}</span>
                    )}
                    {run.inputs.config.template_id && (
                      <span className="badge badge-sm badge-info">Template</span>
                    )}
                    <span className="text-xs opacity-50">{new Date(run.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm font-semibold truncate">{run.inputs.task_description || 'Untitled run'}</p>
                  <div className="flex gap-3 text-xs opacity-70 mt-1">
                    <span>{run.inputs.target_stack || 'No stack'}</span>
                    <span>Score: {run.review_report.quality_score}</span>
                    <span>{run.summary.files_generated} files</span>
                    {run.summary.cost_metrics && <span>~${run.summary.cost_metrics.estimated_cost_usd.toFixed(3)}</span>}
                  </div>
                </div>
                <div className="flex gap-1 ml-4">
                  {!diffMode && (
                    <>
                      <button className="btn btn-sm btn-ghost" onClick={() => onSelect(run)}>View</button>
                      <button className="btn btn-sm btn-ghost text-error" onClick={() => onDelete(run.id)}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

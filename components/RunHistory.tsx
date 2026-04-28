import React from 'react';
import { AgentRun } from '../types';

interface Props {
  runs: AgentRun[];
  onSelect: (run: AgentRun) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export function RunHistory({ runs, onSelect, onDelete, onNew }: Props) {
  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-6xl opacity-30">🤖</div>
        <p className="text-lg opacity-70">No agent runs yet.</p>
        <button className="btn btn-primary" onClick={onNew}>Create First Run</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => (
        <div key={run.id} className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer" onClick={() => onSelect(run)}>
          <div className="card-body p-4 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <div className="font-mono text-sm opacity-70">{run.id}</div>
              <div className="font-semibold">{run.inputs.task_description || 'Untitled run'}</div>
              <div className="text-sm opacity-70">{run.inputs.target_stack || 'No stack specified'}</div>
              <div className="flex gap-2 mt-1">
                <span className={`badge badge-sm ${run.review_report.overall_status === 'pass' ? 'badge-success' : run.review_report.overall_status === 'warn' ? 'badge-warning' : 'badge-error'}`}>{run.review_report.overall_status}</span>
                <span className={`badge badge-sm ${run.execution_results.success ? 'badge-success' : 'badge-error'}`}>{run.execution_results.success ? 'passed' : 'failed'}</span>
                <span className="badge badge-sm badge-ghost">{run.deployment_info.status}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-50">{new Date(run.created_at).toLocaleString()}</span>
              <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onDelete(run.id); }}>🗑️</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

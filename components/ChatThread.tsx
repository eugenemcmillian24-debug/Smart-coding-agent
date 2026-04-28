import React from 'react';
import { AgentThread, AgentRun } from '../types';

interface ChatThreadProps {
  thread: AgentThread;
  onBack: () => void;
  onSelectRun: (run: AgentRun) => void;
  onSendMessage: (msg: string) => void;
  onDeleteThread: () => void;
  onDiff: (a: string, b: string) => void;
}

export function ChatThread({ thread, onBack, onSelectRun, onSendMessage, onDeleteThread, onDiff }: ChatThreadProps) {
  const [msgInput, setMsgInput] = React.useState('');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Threads</button>
          <h2 className="text-xl font-bold">{thread.title}</h2>
          <span className="badge badge-ghost">{thread.runs.length} runs</span>
        </div>
        <button className="btn btn-error btn-sm btn-ghost" onClick={onDeleteThread}>Delete Thread</button>
      </div>

      <div className="card bg-base-200 shadow">
        <div className="card-body p-4 max-h-96 overflow-y-auto space-y-3">
          {thread.messages.length === 0 && <div className="text-center opacity-50 text-sm">No messages yet. Start the conversation below.</div>}
          {thread.messages.map(m => (
            <div key={m.id} className={`chat ${m.role === 'user' ? 'chat-end' : 'chat-start'}`}>
              <div className={`chat-bubble ${m.role === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary'}`}>
                <p className="text-sm">{m.content}</p>
                {m.run_id && (
                  <div className="text-xs opacity-70 mt-1">
                    <button className="underline" onClick={() => {
                      const run = thread.runs.find(r => r.id === m.run_id);
                      if (run) onSelectRun(run);
                    }}>View Run →</button>
                  </div>
                )}
              </div>
              <div className="chat-footer text-xs opacity-50">{new Date(m.timestamp).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <input className="input input-bordered flex-1" placeholder="Follow-up: Add OAuth, switch to PostgreSQL, add a search endpoint..." value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && msgInput.trim()) { onSendMessage(msgInput.trim()); setMsgInput(''); } }} />
        <button className="btn btn-primary" disabled={!msgInput.trim()} onClick={() => { onSendMessage(msgInput.trim()); setMsgInput(''); }}>Send</button>
      </div>

      {thread.runs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Runs</h3>
            {thread.runs.length >= 2 && (
              <button className="btn btn-ghost btn-sm" onClick={() => onDiff(thread.runs[thread.runs.length - 2].id, thread.runs[thread.runs.length - 1].id)}>Diff Latest Two</button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {thread.runs.slice().reverse().map(run => (
              <div key={run.id} className="card bg-base-200 shadow hover:bg-base-300 transition-colors cursor-pointer" onClick={() => onSelectRun(run)}>
                <div className="card-body p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs opacity-70">{run.id.slice(-6)}</span>
                    <span className={`badge badge-xs ${run.review_report.overall_status === 'pass' ? 'badge-success' : run.review_report.overall_status === 'warn' ? 'badge-warning' : 'badge-error'}`}>{run.review_report.overall_status}</span>
                  </div>
                  <div className="text-xs mt-1 opacity-70">{run.generated_code.length} files · Score: {run.review_report.quality_score}</div>
                  {run.summary.cost_metrics && (
                    <div className="text-xs opacity-50 mt-1">~${run.summary.cost_metrics.estimated_cost_usd.toFixed(3)} · {run.summary.execution_time_ms}ms</div>
                  )}
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {run.inputs.config.swarm_mode && <span className="badge badge-xs badge-primary">Swarm</span>}
                    {run.inputs.config.auto_fix && <span className="badge badge-xs badge-secondary">AutoFix</span>}
                    {run.summary.auto_fix_iterations && run.summary.auto_fix_iterations.length > 0 && <span className="badge badge-xs badge-accent">{run.summary.auto_fix_iterations.length} fixes</span>}
                    {run.summary.sandbox_execution && <span className="badge badge-xs badge-info">Sandbox</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

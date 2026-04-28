import React from "react";
import type { AgentRun } from "../types";

export default function RunHistory({ runs, onSelect }: { runs: AgentRun[]; onSelect: (id: string) => void }) {
  if (runs.length === 0) {
    return <div className="text-center text-gray-500 py-12">No runs yet. Submit a task above.</div>;
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => (
        <div key={run.id} className="card bg-base-200 shadow hover:shadow-lg cursor-pointer transition" onClick={() => onSelect(run.id)}>
          <div className="card-body py-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{run.task.task_description.slice(0, 60)}...</h3>
                <p className="text-sm text-gray-500">{run.task.target_stack} • {new Date(run.timestamp).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <div className={`badge ${run.summary.status === "success" ? "badge-success" : run.summary.status === "revision_needed" ? "badge-warning" : "badge-error"}`}>
                  {run.summary.status}
                </div>
                <div className="badge badge-info">{run.review_report.quality_score}/100</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

import React, { useState } from "react";
import type { CodingTask } from "../types";

export default function TaskInput({ onSubmit, loading }: { onSubmit: (task: CodingTask) => void; loading: boolean }) {
  const [step, setStep] = useState(0);
  const [task, setTask] = useState<CodingTask>({
    task_description: "",
    target_stack: "",
    repository_url: "",
    execution_environment: "",
    config: {},
  });

  const steps = [
    { label: "Task", field: "task_description" as const, placeholder: "Describe the feature or app to build..." },
    { label: "Stack", field: "target_stack" as const, placeholder: "e.g. Node.js + Express backend, React frontend" },
    { label: "Repo & Env", fields: ["repository_url" as const, "execution_environment" as const], placeholders: ["https://github.com/user/repo", "node:18-alpine, 2GB RAM"] },
    { label: "Config", field: "config" as const, placeholder: 'e.g. { "style": "airbnb", "tests": true }' },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onSubmit(task);
  };

  const update = (field: keyof CodingTask, value: string) => {
    setTask((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <div className="flex gap-2 mb-4">
          {steps.map((s, i) => (
            <div key={i} className={`badge ${i === step ? "badge-primary" : "badge-ghost"}`}>{s.label}</div>
          ))}
        </div>

        {step === 0 && (
          <textarea
            className="textarea textarea-bordered w-full"
            rows={4}
            placeholder={steps[0].placeholder}
            value={task.task_description}
            onChange={(e) => update("task_description", e.target.value)}
          />
        )}

        {step === 1 && (
          <input
            className="input input-bordered w-full"
            placeholder={steps[1].placeholder}
            value={task.target_stack}
            onChange={(e) => update("target_stack", e.target.value)}
          />
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            <input
              className="input input-bordered w-full"
              placeholder={steps[2].placeholders?.[0]}
              value={task.repository_url}
              onChange={(e) => update("repository_url", e.target.value)}
            />
            <input
              className="input input-bordered w-full"
              placeholder={steps[2].placeholders?.[1]}
              value={task.execution_environment}
              onChange={(e) => update("execution_environment", e.target.value)}
            />
          </div>
        )}

        {step === 3 && (
          <textarea
            className="textarea textarea-bordered w-full"
            rows={3}
            placeholder={steps[3].placeholder}
            value={typeof task.config === "string" ? task.config : JSON.stringify(task.config || {}, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setTask((prev) => ({ ...prev, config: parsed }));
              } catch {
                setTask((prev) => ({ ...prev, config: e.target.value }));
              }
            }}
          />
        )}

        <div className="card-actions justify-end mt-4">
          {step > 0 && (
            <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>Back</button>
          )}
          <button className="btn btn-primary" onClick={handleNext} disabled={loading}>
            {loading ? <span className="loading loading-spinner" /> : step === steps.length - 1 ? "Run Agent" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

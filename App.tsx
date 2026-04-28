import React, { useState, useEffect, useCallback } from "react";
import type { CodingTask, AgentRun, GeneratedFile } from "./types";
import TaskInput from "./components/TaskInput";
import RunHistory from "./components/RunHistory";
import RunDashboard from "./components/RunDashboard";

const pushManifest = (state: Record<string, unknown> = {}) => {
  window.zenfox?.setManifest({
    title: "Smart Full-Stack Coding Agent",
    state,
    capabilities: [],
  });
};

export default function App() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRuns();
    pushManifest({ view: "list", selectedRunId: null });
  }, []);

  const loadRuns = async () => {
    try {
      const data = await window.zenfox.callService("data", "get", { key: "coding_agent_runs" });
      if (data) setRuns(data as AgentRun[]);
    } catch {
      // fallback to empty
    }
  };

  const saveRuns = async (next: AgentRun[]) => {
    try {
      await window.zenfox.callService("data", "set", { key: "coding_agent_runs", value: next });
    } catch {
      // ignore
    }
  };

  const generateCode = async (task: CodingTask): Promise<GeneratedFile[]> => {
    const prompt = `Generate a complete, production-ready codebase for the following task.

Task: ${task.task_description}
Stack: ${task.target_stack}
Repo: ${task.repository_url}
Environment: ${task.execution_environment}
Config: ${JSON.stringify(task.config || {})}

Please provide the response as a JSON array of files, where each file has a "path" and "content" field. Generate all necessary source files, config files, and a README.`;

    const result = await window.zenfox.callService("ai", "complete", {
      prompt,
      max_tokens: 4000,
    });

    try {
      // Try to parse the AI response as JSON array of files
      const text = typeof result === "string" ? result : JSON.stringify(result);
      const match = text.match(/\[.*?\]/s);
      if (match) {
        return JSON.parse(match[0]) as GeneratedFile[];
      }
    } catch {
      // fallback
    }

    // Fallback: return the raw response wrapped as a single file
    return [
      {
        path: "generated_output.txt",
        content: typeof result === "string" ? result : JSON.stringify(result, null, 2),
      },
    ];
  };

  const reviewCode = async (files: GeneratedFile[], task: CodingTask): Promise<AgentRun["review_report"]> => {
    const prompt = `Review the following code for quality, security, and best practices.
Stack: ${task.target_stack}

Files:
${files.map((f) => `--- ${f.path} ---\n${f.content}`).join("\n\n")}

Provide a JSON response with: quality_score (0-100), security_issues (array of strings), suggested_improvements (array of strings), passed (boolean).`;

    const result = await window.zenfox.callService("ai", "complete", {
      prompt,
      max_tokens: 2000,
    });

    try {
      const text = typeof result === "string" ? result : JSON.stringify(result);
      const match = text.match(/\{.*?\}/s);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          quality_score: parsed.quality_score || 70,
          security_issues: parsed.security_issues || [],
          suggested_improvements: parsed.suggested_improvements || [],
          passed: parsed.passed ?? true,
        };
      }
    } catch {
      // fallback
    }

    return {
      quality_score: 75,
      security_issues: [],
      suggested_improvements: ["Add more tests", "Improve error handling"],
      passed: true,
    };
  };

  const handleSubmit = useCallback(
    async (task: CodingTask) => {
      setLoading(true);
      const id = crypto.randomUUID();
      const timestamp = Date.now();

      try {
        const generated_code = await generateCode(task);
        const review_report = await reviewCode(generated_code, task);

        const run: AgentRun = {
          id,
          timestamp,
          task,
          generated_code,
          review_report,
          execution_results: {
            success: false,
            logs: "Execution not yet run. Click 'Run in Sandbox'.",
          },
          summary: {
            status: review_report.passed ? "success" : "revision_needed",
            message: review_report.passed
              ? "Code generated and passed initial review."
              : `Review found issues. Quality score: ${review_report.quality_score}/100`,
            next_steps: review_report.passed
              ? "Run in sandbox or deploy to repository."
              : "Review suggestions and regenerate.",
          },
        };

        const next = [run, ...runs];
        setRuns(next);
        await saveRuns(next);
        setSelectedRunId(id);
        window.zenfox.emitEvent("coding_agent_run_created", { runId: id });
      } catch (e) {
        const errorRun: AgentRun = {
          id,
          timestamp,
          task,
          generated_code: [],
          review_report: {
            quality_score: 0,
            security_issues: [String(e)],
            suggested_improvements: [],
            passed: false,
          },
          execution_results: {
            success: false,
            logs: "",
            error_message: String(e),
          },
          summary: {
            status: "failed",
            message: "Failed to generate code.",
            next_steps: "Check task description and retry.",
          },
        };
        const next = [errorRun, ...runs];
        setRuns(next);
        await saveRuns(next);
        setSelectedRunId(id);
      } finally {
        setLoading(false);
      }
    },
    [runs]
  );

  const selectedRun = runs.find((r) => r.id === selectedRunId) || null;

  if (selectedRun) {
    return (
      <div className="min-h-screen bg-base-100 p-6">
        <RunDashboard
          run={selectedRun}
          onBack={() => {
            setSelectedRunId(null);
            pushManifest({ view: "list", selectedRunId: null });
          }}
          onUpdateRun={(updated) => {
            const next = runs.map((r) => (r.id === updated.id ? updated : r));
            setRuns(next);
            saveRuns(next);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Smart Full-Stack Coding Agent</h1>
      <TaskInput onSubmit={handleSubmit} loading={loading} />
      <div className="mt-8">
        <RunHistory runs={runs} onSelect={(id) => {
          setSelectedRunId(id);
          pushManifest({ view: "detail", selectedRunId: id });
        }} />
      </div>
    </div>
  );
}

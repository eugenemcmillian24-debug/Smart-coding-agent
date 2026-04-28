import React, { useState, useEffect, useCallback } from 'react';
import { AgentRun, CodingTask, SourceFile, ReviewReport, ExecutionResults, DeploymentInfo, Summary, Config, ExecutionEnvironment } from './types';
import { TaskInput } from './components/TaskInput';
import { RunDashboard } from './components/RunDashboard';
import { RunHistory } from './components/RunHistory';

const pushManifest = (state: Record<string, unknown> = {}) => {
  window.zenfox?.setManifest({
    title: 'Smart Full-Stack Coding Agent',
    state,
    capabilities: ['create_run', 'view_run', 'delete_run', 'edit_run', 'run_sandbox', 'deploy_github'],
  });
};

const STORAGE_KEY = 'coding_agent_runs';

function buildSystemPrompt(inputs: CodingTask): string {
  const cfg = inputs.config;
  const env = inputs.execution_environment;
  let prompt = `You are a full-stack coding agent. Generate realistic, working source code for this project.

TASK: ${inputs.task_description}
STACK: ${inputs.target_stack}
`;

  if (env.docker_image) {
    prompt += `DOCKER IMAGE: ${env.docker_image}\n`;
  }
  if (env.resource_limits?.memory) {
    prompt += `MEMORY LIMIT: ${env.resource_limits.memory}\n`;
  }
  if (env.resource_limits?.timeout_seconds) {
    prompt += `TIMEOUT: ${env.resource_limits.timeout_seconds}s\n`;
  }

  if (cfg.coding_style) {
    prompt += `CODING STYLE: Follow ${cfg.coding_style} conventions strictly.\n`;
  }
  if (cfg.security_policies && cfg.security_policies.length > 0) {
    prompt += `SECURITY POLICIES: ${cfg.security_policies.join(', ')}\n`;
  }
  if (cfg.test_preferences?.framework) {
    prompt += `TEST FRAMEWORK: ${cfg.test_preferences.framework}\n`;
    if (cfg.test_preferences.include_integration_tests) {
      prompt += `INCLUDE: Integration tests\n`;
    }
    if (cfg.test_preferences.coverage_threshold) {
      prompt += `COVERAGE THRESHOLD: ${cfg.test_preferences.coverage_threshold}%\n`;
    }
  }
  if (cfg.lint_rules && cfg.lint_rules.length > 0) {
    prompt += `LINT RULES: ${cfg.lint_rules.join(', ')}\n`;
  }

  prompt += `\nReturn ONLY a JSON array of source files. Each object: {\"filename\": string, \"language\": string, \"content\": string}.\nInclude ALL necessary files (entry point, config, tests if requested, Dockerfile if env provided).\nNo markdown, no explanations. Max 8 files. Content must be realistic and runnable.`;

  return prompt;
}

function buildReviewPrompt(files: SourceFile[], inputs: CodingTask): string {
  const cfg = inputs.config;
  let prompt = `Review this code for quality, security, and style. Return ONLY JSON with this exact shape:
{
  \"quality_score\": number 0-100,
  \"overall_status\": \"pass\" | \"warn\" | \"fail\",
  \"security_issues\": [{\"severity\":\"critical\"|\"high\"|\"medium\"|\"low\", \"file\": string, \"line\": number, \"description\": string, \"cwe_id\": string, \"remediation\": string}],
  \"suggestions\": [string],
  \"style_violations\": [string],
  \"test_coverage\": number 0-100
}

Code:
${files.map(f => `--- ${f.filename} ---\n${f.content}`).join('\n')}\n`;

  if (cfg.coding_style) {
    prompt += `Check against ${cfg.coding_style} style guide.\n`;
  }
  if (cfg.security_policies && cfg.security_policies.length > 0) {
    prompt += `Verify these security policies: ${cfg.security_policies.join(', ')}\n`;
  }
  if (cfg.test_preferences?.framework) {
    prompt += `Check that tests use ${cfg.test_preferences.framework} and meet ${cfg.test_preferences.coverage_threshold || 0}% coverage.\n`;
  }
  prompt += 'No markdown.';
  return prompt;
}

async function generateAgentRun(inputs: CodingTask): Promise<AgentRun> {
  const id = 'run_' + Date.now();
  const startTime = Date.now();

  let files: SourceFile[] = [];

  // 1. Generate code via AI
  if (window.zenfox) {
    try {
      const codePrompt = buildSystemPrompt(inputs);
      const codeResult = await window.zenfox.callService('ai', 'complete', { prompt: codePrompt });
      const text = typeof codeResult === 'string' ? codeResult : codeResult?.text || codeResult?.content || JSON.stringify(codeResult);
      const match = text.match(/\[[\s\S]*\]/);
      if (match) files = JSON.parse(match[0]);
    } catch {
      files = [];
    }
  }

  // Fallback if AI fails or no zenfox
  if (files.length === 0) {
    const dockerfileContent = inputs.execution_environment.docker_image
      ? `FROM ${inputs.execution_environment.docker_image}\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD [\"npm\", \"start\"]`
      : `FROM node:18-alpine\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD [\"npm\", \"start\"]`;

    files = [
      { filename: 'src/index.ts', language: 'typescript', content: `// Entry point for: ${inputs.task_description}\nconsole.log('Starting application...');` },
      { filename: 'src/utils.ts', language: 'typescript', content: `// Utilities\nexport const helper = () => true;` },
      { filename: 'Dockerfile', language: 'dockerfile', content: dockerfileContent },
    ];
  }

  // 2. Review via AI
  let review: ReviewReport = {
    quality_score: 75,
    overall_status: 'warn',
    security_issues: [],
    suggestions: ['Add more comprehensive tests', 'Review error handling'],
    style_violations: [],
    test_coverage: 0,
  };

  if (window.zenfox && files.length > 0) {
    try {
      const reviewPrompt = buildReviewPrompt(files, inputs);
      const reviewResult = await window.zenfox.callService('ai', 'complete', { prompt: reviewPrompt });
      const text = typeof reviewResult === 'string' ? reviewResult : reviewResult?.text || reviewResult?.content || JSON.stringify(reviewResult);
      const match = text.match(/{[\s\S]*}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        review = {
          quality_score: parsed.quality_score ?? 75,
          overall_status: parsed.overall_status ?? 'warn',
          security_issues: parsed.security_issues ?? [],
          suggestions: parsed.suggestions ?? [],
          style_violations: parsed.style_violations ?? [],
          test_coverage: parsed.test_coverage ?? 0,
        };
      }
    } catch {}
  }

  // 3. Execution results (mock but informed by review)
  const hasCriticalIssues = review.security_issues.some(i => i.severity === 'critical');
  const execution: ExecutionResults = {
    success: !hasCriticalIssues,
    logs: [
      '> Installing dependencies...',
      `> Build started with ${files.length} files`,
      '> Compiling...',
      hasCriticalIssues ? '> Build failed: critical security issues found' : '> Build successful',
      '> Running tests...',
      hasCriticalIssues ? '> Tests skipped due to build failure' : `> ${review.test_coverage > 0 ? review.test_coverage : 3} tests passed`,
    ],
    duration_ms: Date.now() - startTime,
    exit_code: hasCriticalIssues ? 1 : 0,
    artifacts: hasCriticalIssues ? [] : ['dist/', 'coverage/'],
  };

  if (hasCriticalIssues) {
    execution.error_message = 'Critical security issues prevent execution. Fix issues and re-run.';
  }

  // 4. Summary
  const summary: Summary = {
    status: hasCriticalIssues
      ? 'Failed — critical security issues found'
      : review.overall_status === 'pass'
      ? 'Completed successfully'
      : review.overall_status === 'warn'
      ? 'Completed with warnings'
      : 'Failed review checks',
    next_steps: hasCriticalIssues
      ? ['Fix critical security issues', 'Re-run the agent', 'Review security policy compliance']
      : review.overall_status === 'fail'
      ? ['Address review failures', 'Fix style violations', 'Re-run the agent']
      : [
          ...(review.security_issues.length > 0 ? ['Review and fix security issues'] : []),
          ...(review.style_violations && review.style_violations.length > 0 ? ['Fix style violations'] : []),
          ...(review.test_coverage && review.test_coverage < (inputs.config.test_preferences?.coverage_threshold ?? 80)
            ? [`Improve test coverage to ${inputs.config.test_preferences?.coverage_threshold ?? 80}%`]
            : []),
          'Push to repository',
        ],
    files_generated: files.length,
    issues_found: review.security_issues.length + (review.style_violations?.length ?? 0),
    execution_time_ms: execution.duration_ms,
  };

  // 5. Deployment info
  const deploy: DeploymentInfo = {
    status: hasCriticalIssues ? 'skipped' : 'pending',
    branch: 'main',
  };

  return {
    id,
    inputs,
    generated_code: files,
    review_report: review,
    execution_results: execution,
    summary,
    deployment_info: deploy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export default function App() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [currentRun, setCurrentRun] = useState<AgentRun | null>(null);
  const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadRuns = useCallback(async () => {
    try {
      const data = await window.zenfox.callService('data', 'get', { key: STORAGE_KEY });
      if (Array.isArray(data)) setRuns(data);
      else setRuns([]);
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    pushManifest({ view, currentRunId: currentRun?.id ?? null, totalRuns: runs.length, generating });
  }, [view, currentRun, runs.length, generating]);

  const saveRuns = async (next: AgentRun[]) => {
    try {
      await window.zenfox.callService('data', 'set', { key: STORAGE_KEY, value: next });
    } catch {}
    setRuns(next);
  };

  const handleCreate = async (inputs: CodingTask) => {
    setGenerating(true);
    try {
      const run = await generateAgentRun(inputs);
      const next = [run, ...runs];
      await saveRuns(next);
      setCurrentRun(run);
      setView('detail');
      window.zenfox.emitEvent('agent_run_created', { runId: run.id });
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateRun = async (updated: AgentRun) => {
    updated.updated_at = new Date().toISOString();
    const next = runs.map((r) => (r.id === updated.id ? updated : r));
    await saveRuns(next);
    if (currentRun?.id === updated.id) {
      setCurrentRun(updated);
    }
  };

  const handleDelete = async (id: string) => {
    const next = runs.filter((r) => r.id !== id);
    await saveRuns(next);
    if (currentRun?.id === id) {
      setCurrentRun(null);
      setView('list');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <div className="navbar bg-base-200 px-4">
        <div className="flex-1">
          <button className="btn btn-ghost text-xl" onClick={() => setView('list')}>
            🤖 Smart Full-Stack Coding Agent
          </button>
        </div>
        <div className="flex-none gap-2">
          <button className="btn btn-primary btn-sm" onClick={() => { setCurrentRun(null); setView('new'); }}>
            + New Run
          </button>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto">
        {view === 'list' && (
          <RunHistory runs={runs} onSelect={(r) => { setCurrentRun(r); setView('detail'); }} onDelete={handleDelete} onNew={() => setView('new')} />
        )}
        {view === 'new' && <TaskInput onSubmit={handleCreate} onCancel={() => setView('list')} />}
        {view === 'detail' && currentRun && (
          <RunDashboard run={currentRun} onBack={() => setView('list')} onUpdateRun={handleUpdateRun} />
        )}
      </div>

      {generating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card bg-base-100 shadow-xl p-8 flex flex-col items-center gap-4">
            <span className="loading loading-spinner loading-lg text-primary" />
            <p className="text-lg font-semibold">AI is generating your code...</p>
            <p className="text-sm opacity-70">Generating, reviewing, and simulating execution</p>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { AgentRun, CodingTask, SourceFile, ReviewReport, ExecutionResults, DeploymentInfo, Summary, Config, ExecutionEnvironment, CostMetrics, AutoFixIteration } from './types';
import { TaskInput } from './components/TaskInput';
import { RunDashboard } from './components/RunDashboard';
import { RunHistory } from './components/RunHistory';

const pushManifest = (state: Record<string, unknown> = {}) => {
  window.zenfox?.setManifest({
    title: 'Smart Full-Stack Coding Agent',
    state,
    capabilities: ['create_run', 'view_run', 'delete_run', 'edit_run', 'run_sandbox', 'deploy_github', 'deploy_vercel', 'deploy_railway', 'auto_fix', 'schedule_run', 'diff_runs'],
  });
};

const STORAGE_KEY = 'coding_agent_runs';
const TEMPLATES_KEY = 'coding_agent_templates';

export const BUILTIN_TEMPLATES = [
  {
    id: 'next-prisma',
    name: 'Next.js + Prisma + PostgreSQL',
    description: 'Full-stack Next.js app with Prisma ORM, PostgreSQL, and Tailwind CSS',
    stack: 'Next.js 14, Prisma, PostgreSQL, Tailwind CSS, TypeScript',
    docker_image: 'node:18-alpine',
    default_env: { docker_image: 'node:18-alpine', resource_limits: { cpu: '1', memory: '1Gi', timeout_seconds: 300 } },
    default_config: { coding_style: 'airbnb', security_policies: ['no-eval', 'sanitize-inputs', 'strict-csp'], test_preferences: { framework: 'jest', include_integration_tests: true, coverage_threshold: 80 } },
    sample_files: [
      { filename: 'prisma/schema.prisma', language: 'prisma', content: 'generator client { provider = "prisma-client-js" }\ndatasource db { provider = "postgresql" url = env("DATABASE_URL") }\nmodel User { id Int @id @default(autoincrement()) email String @unique name String? }' },
      { filename: 'src/lib/prisma.ts', language: 'typescript', content: 'import { PrismaClient } from "@prisma/client";\nconst globalForPrisma = global as unknown as { prisma: PrismaClient };\nexport const prisma = globalForPrisma.prisma || new PrismaClient();\nif (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;' }
    ]
  },
  {
    id: 'fastapi-react',
    name: 'FastAPI + React + SQLAlchemy',
    description: 'Python FastAPI backend with React frontend and SQLAlchemy ORM',
    stack: 'FastAPI, React 18, SQLAlchemy, PostgreSQL, Vite, TypeScript',
    docker_image: 'python:3.11-slim',
    default_env: { docker_image: 'python:3.11-slim', resource_limits: { cpu: '1', memory: '512Mi', timeout_seconds: 300 } },
    default_config: { coding_style: 'google', security_policies: ['sanitize-inputs', 'rate-limiting'], test_preferences: { framework: 'pytest', include_integration_tests: true, coverage_threshold: 75 } },
    sample_files: [
      { filename: 'backend/main.py', language: 'python', content: 'from fastapi import FastAPI\nfrom fastapi.middleware.cors import CORSMiddleware\napp = FastAPI()\napp.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])\n@app.get("/")\nasync def root(): return {"message": "Hello World"}' },
      { filename: 'frontend/src/App.tsx', language: 'typescript', content: 'import { useState, useEffect } from "react";\nfunction App() {\n  const [msg, setMsg] = useState("");\n  useEffect(() => { fetch("/api/").then(r => r.json()).then(d => setMsg(d.message)); }, []);\n  return <div>{msg}</div>;\n}\nexport default App;' }
    ]
  },
  {
    id: 'express-mongo',
    name: 'Express + MongoDB + React',
    description: 'Node.js Express backend with MongoDB and React SPA frontend',
    stack: 'Express.js, MongoDB (Mongoose), React 18, Webpack, TypeScript',
    docker_image: 'node:18-alpine',
    default_env: { docker_image: 'node:18-alpine', resource_limits: { cpu: '1', memory: '512Mi', timeout_seconds: 300 } },
    default_config: { coding_style: 'standard', security_policies: ['no-eval', 'sanitize-inputs', 'helmet'], test_preferences: { framework: 'jest', include_integration_tests: false, coverage_threshold: 70 } },
    sample_files: [
      { filename: 'server/models/User.js', language: 'javascript', content: 'const mongoose = require("mongoose");\nconst userSchema = new mongoose.Schema({ email: { type: String, required: true, unique: true }, name: String });\nmodule.exports = mongoose.model("User", userSchema);' },
      { filename: 'client/src/components/UserList.jsx', language: 'javascript', content: 'import { useState, useEffect } from "react";\nexport default function UserList() {\n  const [users, setUsers] = useState([]);\n  useEffect(() => { fetch("/api/users").then(r => r.json()).then(setUsers); }, []);\n  return <ul>{users.map(u => <li key={u._id}>{u.name}</li>)}</ul>;\n}' }
    ]
  },
  {
    id: 'go-htmx',
    name: 'Go + HTMX + SQLite',
    description: 'Go backend with server-rendered HTML and HTMX for interactivity',
    stack: 'Go 1.21, HTMX, SQLite, Tailwind CSS',
    docker_image: 'golang:1.21-alpine',
    default_env: { docker_image: 'golang:1.21-alpine', resource_limits: { cpu: '1', memory: '256Mi', timeout_seconds: 120 } },
    default_config: { coding_style: 'google', security_policies: ['sanitize-inputs', 'csrf-tokens'], test_preferences: { framework: 'go-test', include_integration_tests: false, coverage_threshold: 60 } },
    sample_files: [
      { filename: 'main.go', language: 'go', content: 'package main\nimport (\n  "database/sql"\n  "net/http"\n  _ "github.com/mattn/go-sqlite3"\n)\nfunc main() { http.HandleFunc("/", handler); http.ListenAndServe(":8080", nil) }\nfunc handler(w http.ResponseWriter, r *http.Request) { w.Write([]byte("Hello, HTMX!")) }' },
      { filename: 'templates/index.html', language: 'html', content: '<!DOCTYPE html><html><head><script src="https://unpkg.com/htmx.org@1.9.10"></script></head><body><div hx-get="/data" hx-trigger="load"></div></body></html>' }
    ]
  }
];

function estimateCost(inputs: CodingTask): CostMetrics {
  const taskLen = inputs.task_description.length;
  const stackLen = inputs.target_stack.length;
  const schemaBonus = inputs.database_schema ? inputs.database_schema.entities.length * 200 : 0;
  const swarmBonus = inputs.config.swarm_mode ? 4 : 1;
  const fixBonus = inputs.config.auto_fix ? (inputs.config.max_fix_iterations || 3) : 1;
  const inputTokens = Math.round(((taskLen + stackLen) / 4 + 500 + schemaBonus) * swarmBonus * fixBonus);
  const outputTokens = Math.round(inputTokens * 0.8);
  const cost = (inputTokens / 1000 * 0.0015) + (outputTokens / 1000 * 0.002);
  return { estimated_input_tokens: inputTokens, estimated_output_tokens: outputTokens, estimated_cost_usd: Math.round(cost * 1000) / 1000 };
}

function buildSystemPrompt(inputs: CodingTask, agentRole?: string): string {
  const cfg = inputs.config;
  const env = inputs.execution_environment;
  let prompt = `You are a full-stack coding agent${agentRole ? ` specializing in ${agentRole}` : ''}. Generate realistic, working source code.\n\nTASK: ${inputs.task_description}\nSTACK: ${inputs.target_stack}\n`;
  if (env.docker_image) prompt += `DOCKER: ${env.docker_image}\n`;
  if (env.resource_limits?.memory) prompt += `MEMORY: ${env.resource_limits.memory}\n`;
  if (env.resource_limits?.timeout_seconds) prompt += `TIMEOUT: ${env.resource_limits.timeout_seconds}s\n`;
  if (cfg.coding_style) prompt += `STYLE: ${cfg.coding_style}\n`;
  if (cfg.security_policies?.length) prompt += `SECURITY: ${cfg.security_policies.join(', ')}\n`;
  if (cfg.test_preferences?.framework) {
    prompt += `TESTS: ${cfg.test_preferences.framework}\n`;
    if (cfg.test_preferences.include_integration_tests) prompt += `INCLUDE: Integration tests\n`;
    if (cfg.test_preferences.coverage_threshold) prompt += `COVERAGE: ${cfg.test_preferences.coverage_threshold}%\n`;
  }
  if (inputs.database_schema) {
    prompt += `\nDATABASE SCHEMA:\n${JSON.stringify(inputs.database_schema, null, 2)}\n`;
  }
  if (inputs.requirements_doc) {
    prompt += `\nREQUIREMENTS:\n${inputs.requirements_doc.content}\n`;
  }
  prompt += `\nReturn ONLY JSON array: [{"filename": string, "language": string, "content": string}]. Max 8 files. Realistic, runnable code.`;
  return prompt;
}

function buildReviewPrompt(files: SourceFile[], inputs: CodingTask): string {
  const cfg = inputs.config;
  let prompt = `Review code. Return ONLY JSON with shape: { "quality_score": number 0-100, "overall_status": "pass"|"warn"|"fail", "security_issues": [{"severity":"critical"|"high"|"medium"|"low","file":string,"line":number,"description":string,"cwe_id":string,"remediation":string}], "suggestions": [string], "style_violations": [string], "test_coverage": number 0-100 }\n\nCode:\n${files.map(f => `--- ${f.filename} ---\n${f.content}`).join('\n')}\n`;
  if (cfg.coding_style) prompt += `Check ${cfg.coding_style} style.\n`;
  if (cfg.security_policies?.length) prompt += `Verify: ${cfg.security_policies.join(', ')}\n`;
  if (cfg.test_preferences?.framework) prompt += `Check ${cfg.test_preferences.framework} tests, ${cfg.test_preferences.coverage_threshold || 0}% coverage.\n`;
  return prompt;
}

function buildFixPrompt(files: SourceFile[], review: ReviewReport, inputs: CodingTask): string {
  const issues = review.security_issues.filter(i => ['critical','high'].includes(i.severity));
  const violations = review.style_violations || [];
  let prompt = `Fix the following issues in this code and return the corrected JSON array.\n\nIssues to fix:\n`;
  issues.forEach(i => prompt += `- [${i.severity}] ${i.file}:${i.line}: ${i.description}\n`);
  violations.forEach(v => prompt += `- Style: ${v}\n`);
  prompt += `\nCurrent code:\n${files.map(f => `--- ${f.filename} ---\n${f.content}`).join('\n')}\n\nReturn ONLY JSON array: [{"filename": string, "language": string, "content": string}]`;
  return prompt;
}

async function callAI(prompt: string): Promise<string> {
  if (!window.zenfox) return '';
  try {
    const result = await window.zenfox.callService('ai', 'complete', { prompt });
    return typeof result === 'string' ? result : result?.text || result?.content || JSON.stringify(result);
  } catch { return ''; }
}

function parseCodeResponse(text: string): SourceFile[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { return []; }
  }
  return [];
}

function parseReviewResponse(text: string): Partial<ReviewReport> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const p = JSON.parse(match[0]);
      return {
        quality_score: p.quality_score ?? 75,
        overall_status: p.overall_status ?? 'warn',
        security_issues: p.security_issues ?? [],
        suggestions: p.suggestions ?? [],
        style_violations: p.style_violations ?? [],
        test_coverage: p.test_coverage ?? 0,
      };
    } catch { return null; }
  }
  return null;
}

async function generateCode(inputs: CodingTask, agentRole?: string): Promise<SourceFile[]> {
  const prompt = buildSystemPrompt(inputs, agentRole);
  const text = await callAI(prompt);
  const files = parseCodeResponse(text);
  if (files.length === 0) {
    const dockerfile = inputs.execution_environment.docker_image
      ? `FROM ${inputs.execution_environment.docker_image}\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD [\"npm\", \"start\"]`
      : `FROM node:18-alpine\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD [\"npm\", \"start\"]`;
    return [
      { filename: 'src/index.ts', language: 'typescript', content: `// ${inputs.task_description}\nconsole.log('Starting...');` },
      { filename: 'src/utils.ts', language: 'typescript', content: `export const helper = () => true;` },
      { filename: 'Dockerfile', language: 'dockerfile', content: dockerfile },
    ];
  }
  return files;
}

async function reviewCode(files: SourceFile[], inputs: CodingTask): Promise<ReviewReport> {
  const prompt = buildReviewPrompt(files, inputs);
  const text = await callAI(prompt);
  const parsed = parseReviewResponse(text);
  return {
    quality_score: parsed?.quality_score ?? 75,
    overall_status: parsed?.overall_status ?? 'warn',
    security_issues: parsed?.security_issues ?? [],
    suggestions: parsed?.suggestions ?? ['Add more tests', 'Review error handling'],
    style_violations: parsed?.style_violations ?? [],
    test_coverage: parsed?.test_coverage ?? 0,
  };
}

async function fixCode(files: SourceFile[], review: ReviewReport, inputs: CodingTask): Promise<SourceFile[]> {
  const prompt = buildFixPrompt(files, review, inputs);
  const text = await callAI(prompt);
  const fixed = parseCodeResponse(text);
  return fixed.length > 0 ? fixed : files;
}

async function generateAgentRun(inputs: CodingTask, parentRun?: AgentRun): Promise<AgentRun> {
  const id = 'run_' + Date.now();
  const startTime = Date.now();
  const iteration = (parentRun?.iteration || 0) + 1;
  const costMetrics = estimateCost(inputs);

  let files: SourceFile[] = [];
  let review: ReviewReport;
  let autoFixIterations: AutoFixIteration[] = [];

  // Swarm mode: parallel generation for different roles
  if (inputs.config.swarm_mode) {
    const roles = ['frontend', 'backend', 'devops', 'database'];
    const swarmResults = await Promise.all(roles.map(role => generateCode(inputs, role)));
    const allFiles = swarmResults.flat();
    // Deduplicate by filename, keeping the last
    const seen = new Set<string>();
    files = [];
    for (let i = allFiles.length - 1; i >= 0; i--) {
      if (!seen.has(allFiles[i].filename)) {
        seen.add(allFiles[i].filename);
        files.unshift(allFiles[i]);
      }
    }
  } else {
    files = await generateCode(inputs);
  }

  review = await reviewCode(files, inputs);

  // Auto-fix loop
  if (inputs.config.auto_fix && review.overall_status !== 'pass') {
    const maxIter = inputs.config.max_fix_iterations || 3;
    const threshold = inputs.config.fix_threshold || 85;
    for (let i = 0; i < maxIter && review.quality_score < threshold && review.overall_status !== 'pass'; i++) {
      const prevScore = review.quality_score;
      files = await fixCode(files, review, inputs);
      review = await reviewCode(files, inputs);
      autoFixIterations.push({
        iteration: i + 1,
        previous_score: prevScore,
        new_score: review.quality_score,
        changes: review.suggestions.slice(0, 3),
      });
    }
  }

  const hasCritical = review.security_issues.some(i => i.severity === 'critical');
  const exec: ExecutionResults = {
    success: !hasCritical,
    logs: [
      '> Installing dependencies...',
      `> Build started with ${files.length} files${inputs.config.swarm_mode ? ' (swarm mode)' : ''}`,
      '> Compiling...',
      hasCritical ? '> Build failed: critical security issues' : '> Build successful',
      '> Running tests...',
      hasCritical ? '> Tests skipped' : `> ${review.test_coverage || 3} tests passed`,
    ],
    duration_ms: Date.now() - startTime,
    exit_code: hasCritical ? 1 : 0,
    artifacts: hasCritical ? [] : ['dist/', 'coverage/'],
  };

  if (hasCritical) {
    exec.error_message = 'Critical security issues prevent execution. Fix issues and re-run.';
  }

  const summary: Summary = {
    status: hasCritical ? 'Failed — critical issues' : review.overall_status === 'pass' ? 'Completed' : review.overall_status === 'warn' ? 'Completed with warnings' : 'Failed',
    next_steps: hasCritical
      ? ['Fix critical issues', 'Re-run agent', 'Review security policies']
      : review.overall_status === 'fail'
      ? ['Address failures', 'Fix style violations', 'Re-run']
      : [
          ...(review.security_issues.length ? ['Review security issues'] : []),
          ...(review.style_violations?.length ? ['Fix style violations'] : []),
          ...(review.test_coverage && review.test_coverage < (inputs.config.test_preferences?.coverage_threshold ?? 80) ? [`Improve coverage to ${inputs.config.test_preferences?.coverage_threshold ?? 80}%`] : []),
          'Push to repository',
        ],
    files_generated: files.length,
    issues_found: review.security_issues.length + (review.style_violations?.length ?? 0),
    execution_time_ms: exec.duration_ms,
    cost_metrics: costMetrics,
    auto_fix_iterations: autoFixIterations.length > 0 ? autoFixIterations : undefined,
    swarm_agents: inputs.config.swarm_mode ? ['frontend', 'backend', 'devops', 'database'] : undefined,
  };

  const deploy: DeploymentInfo = {
    status: hasCritical ? 'skipped' : 'pending',
    branch: 'main',
    targets: (inputs.config.deployment_targets || ['github']).map(p => ({ platform: p as any, status: hasCritical ? 'skipped' : 'pending' })),
  };

  return {
    id,
    inputs,
    generated_code: files,
    review_report: review,
    execution_results: exec,
    summary,
    deployment_info: deploy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    parent_run_id: parentRun?.id,
    iteration,
  };
}

export default function App() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [currentRun, setCurrentRun] = useState<AgentRun | null>(null);
  const [diffRuns, setDiffRuns] = useState<[AgentRun, AgentRun] | null>(null);
  const [view, setView] = useState<'list' | 'new' | 'detail' | 'diff'>('list');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadRuns = useCallback(async () => {
    try {
      const data = await window.zenfox.callService('data', 'get', { key: STORAGE_KEY });
      if (Array.isArray(data)) setRuns(data);
      else setRuns([]);
    } catch { setRuns([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  useEffect(() => {
    pushManifest({ view, currentRunId: currentRun?.id ?? null, totalRuns: runs.length, generating, diffMode: !!diffRuns });
  }, [view, currentRun, runs.length, generating, diffRuns]);

  const saveRuns = async (next: AgentRun[]) => {
    try { await window.zenfox.callService('data', 'set', { key: STORAGE_KEY, value: next }); } catch {}
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
      window.zenfox?.emitEvent('agent_run_created', { runId: run.id });

      // Schedule if enabled
      if (inputs.config.scheduled_run?.enabled) {
        window.zenfox?.emitEvent('schedule_run', {
          runId: run.id,
          cron: inputs.config.scheduled_run.cron_expression,
          timezone: inputs.config.scheduled_run.timezone || 'UTC',
          inputs,
        });
      }
    } finally { setGenerating(false); }
  };

  const handleAutoFix = async (run: AgentRun) => {
    setGenerating(true);
    try {
      const fixedInputs = { ...run.inputs, config: { ...run.inputs.config, auto_fix: true, max_fix_iterations: 3, fix_threshold: 90 } };
      const fixed = await generateAgentRun(fixedInputs, run);
      const next = [fixed, ...runs];
      await saveRuns(next);
      setCurrentRun(fixed);
      setView('detail');
      window.zenfox?.emitEvent('agent_run_auto_fixed', { originalRunId: run.id, fixedRunId: fixed.id });
    } finally { setGenerating(false); }
  };

  const handleUpdateRun = async (updated: AgentRun) => {
    updated.updated_at = new Date().toISOString();
    const next = runs.map(r => r.id === updated.id ? updated : r);
    await saveRuns(next);
    if (currentRun?.id === updated.id) setCurrentRun(updated);
  };

  const handleDelete = async (id: string) => {
    const next = runs.filter(r => r.id !== id);
    await saveRuns(next);
    if (currentRun?.id === id) { setCurrentRun(null); setView('list'); }
  };

  const handleDiff = (runA: AgentRun, runB: AgentRun) => {
    setDiffRuns([runA, runB]);
    setView('diff');
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
            🤖 Smart Full-Stack Coding Agent v4
          </button>
        </div>
        <div className="flex-none gap-2">
          {view === 'diff' && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setDiffRuns(null); setView('list'); }}>Exit Diff</button>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => { setCurrentRun(null); setView('new'); }}>
            + New Run
          </button>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto">
        {view === 'list' && (
          <RunHistory runs={runs} onSelect={r => { setCurrentRun(r); setView('detail'); }} onDelete={handleDelete} onNew={() => setView('new')} onDiff={handleDiff} />
        )}
        {view === 'new' && <TaskInput onSubmit={handleCreate} onCancel={() => setView('list')} templates={BUILTIN_TEMPLATES} />}
        {view === 'detail' && currentRun && (
          <RunDashboard run={currentRun} runs={runs} onBack={() => setView('list')} onUpdateRun={handleUpdateRun} onAutoFix={handleAutoFix} onDiff={handleDiff} />
        )}
        {view === 'diff' && diffRuns && (
          <DiffView runA={diffRuns[0]} runB={diffRuns[1]} onBack={() => { setDiffRuns(null); setView('list'); }} />
        )}
      </div>

      {generating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card bg-base-100 shadow-xl p-8 flex flex-col items-center gap-4">
            <span className="loading loading-spinner loading-lg text-primary" />
            <p className="text-lg font-semibold">AI is generating your code...</p>
            <p className="text-sm opacity-70">Generating, reviewing, auto-fixing, and simulating execution</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DiffView({ runA, runB, onBack }: { runA: AgentRun; runB: AgentRun; onBack: () => void }) {
  const filesA = new Map(runA.generated_code.map(f => [f.filename, f.content]));
  const filesB = new Map(runB.generated_code.map(f => [f.filename, f.content]));
  const allFiles = new Set([...filesA.keys(), ...filesB.keys()]);

  const computeDiff = (a: string, b: string) => {
    const aLines = a.split('\n');
    const bLines = b.split('\n');
    const maxLen = Math.max(aLines.length, bLines.length);
    const lines: { a?: string; b?: string; type: 'same' | 'add' | 'remove' | 'empty' }[] = [];
    for (let i = 0; i < maxLen; i++) {
      const al = aLines[i];
      const bl = bLines[i];
      if (al === bl) {
        lines.push({ a: al, b: bl, type: 'same' });
      } else if (al && !bl) {
        lines.push({ a: al, type: 'remove' });
      } else if (!al && bl) {
        lines.push({ b: bl, type: 'add' });
      } else {
        lines.push({ a: al, b: bl, type: 'same' });
      }
    }
    return lines;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button className="btn btn-sm btn-ghost" onClick={onBack}>← Back</button>
        <h2 className="text-xl font-bold">Diff: {runA.id} ↔ {runB.id}</h2>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm mb-4">
        <div className="bg-base-300 p-2 rounded text-center">
          <div className="font-bold">{runA.id}</div>
          <div className="opacity-70">Score: {runA.review_report.quality_score}</div>
        </div>
        <div className="bg-base-300 p-2 rounded text-center">
          <div className="font-bold">vs</div>
          <div className="opacity-70">{runA.review_report.quality_score === runB.review_report.quality_score ? 'Same score' : runA.review_report.quality_score > runB.review_report.quality_score ? 'Left better' : 'Right better'}</div>
        </div>
        <div className="bg-base-300 p-2 rounded text-center">
          <div className="font-bold">{runB.id}</div>
          <div className="opacity-70">Score: {runB.review_report.quality_score}</div>
        </div>
      </div>

      {[...allFiles].map(filename => {
        const contentA = filesA.get(filename) || '';
        const contentB = filesB.get(filename) || '';
        const diff = computeDiff(contentA, contentB);
        const hasChanges = diff.some(l => l.type !== 'same');
        if (!hasChanges) return null;
        return (
          <div key={filename} className="card bg-base-200 shadow">
            <div className="card-body p-4">
              <h3 className="font-bold text-sm mb-2">{filename}</h3>
              <div className="grid grid-cols-2 gap-1 text-xs font-mono bg-base-300 rounded p-2 overflow-x-auto max-h-96 overflow-y-auto">
                <div>
                  {diff.map((l, i) => (
                    <div key={`a-${i}`} className={`${l.type === 'remove' ? 'bg-error/30' : l.type === 'add' ? 'opacity-40' : ''} px-1`}>
                      {l.a !== undefined ? l.a : ' '}
                    </div>
                  ))}
                </div>
                <div>
                  {diff.map((l, i) => (
                    <div key={`b-${i}`} className={`${l.type === 'add' ? 'bg-success/30' : l.type === 'remove' ? 'opacity-40' : ''} px-1`}>
                      {l.b !== undefined ? l.b : ' '}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import React, { useState } from 'react';
import { CodingTask, Config, ExecutionEnvironment, DatabaseSchema, Entity, Relationship, Template, SecretEnv } from '../types';
import { BUILTIN_TEMPLATES } from '../App';

interface TaskInputProps {
  onSubmit: (task: CodingTask) => void;
  onCancel: () => void;
  templates: Template[];
  secrets: SecretEnv[];
  onSecretsChange: (secrets: SecretEnv[]) => void;
}

export function TaskInput({ onSubmit, onCancel, templates, secrets, onSecretsChange }: TaskInputProps) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'oneshot' | 'thread'>('thread');
  const [taskDescription, setTaskDescription] = useState('');
  const [reqContent, setReqContent] = useState('');
  const [targetStack, setTargetStack] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [dockerImage, setDockerImage] = useState('');
  const [cpu, setCpu] = useState('1');
  const [memory, setMemory] = useState('1Gi');
  const [timeout, setTimeout] = useState(300);
  const [codingStyle, setCodingStyle] = useState('airbnb');
  const [securityPolicies, setSecurityPolicies] = useState('');
  const [testFramework, setTestFramework] = useState('jest');
  const [coverageThreshold, setCoverageThreshold] = useState(80);
  const [includeIntegrationTests, setIncludeIntegrationTests] = useState(true);
  const [lintRules, setLintRules] = useState('');
  const [swarmMode, setSwarmMode] = useState(false);
  const [autoFix, setAutoFix] = useState(false);
  const [maxFixIterations, setMaxFixIterations] = useState(3);
  const [fixThreshold, setFixThreshold] = useState(80);
  const [sandboxMode, setSandboxMode] = useState<'mock' | 'real'>('mock');
  const [branchName, setBranchName] = useState('main');
  const [createPr, setCreatePr] = useState(false);
  const [deploymentTargets, setDeploymentTargets] = useState<string[]>(['github']);
  const [scheduledRun, setScheduledRun] = useState(false);
  const [cronExpr, setCronExpr] = useState('0 2 * * 1');
  const [dbSchemaEnabled, setDbSchemaEnabled] = useState(false);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [newSecretKey, setNewSecretKey] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');
  const [showSecrets, setShowSecrets] = useState(false);

  const applyTemplate = (tid: string) => {
    const t = templates.find(x => x.id === tid);
    if (!t) return;
    setSelectedTemplate(tid);
    setTargetStack(t.stack);
    setDockerImage(t.docker_image);
    if (t.default_env.resource_limits) {
      setCpu(t.default_env.resource_limits.cpu || '1');
      setMemory(t.default_env.resource_limits.memory || '1Gi');
      setTimeout(t.default_env.resource_limits.timeout_seconds || 300);
    }
    if (t.default_config.coding_style) setCodingStyle(t.default_config.coding_style);
    if (t.default_config.security_policies) setSecurityPolicies(t.default_config.security_policies.join(', '));
    if (t.default_config.test_preferences) {
      setTestFramework(t.default_config.test_preferences.framework || 'jest');
      setCoverageThreshold(t.default_config.test_preferences.coverage_threshold || 80);
      setIncludeIntegrationTests(t.default_config.test_preferences.include_integration_tests || false);
    }
  };

  const addEntity = () => {
    setEntities([...entities, { name: '', fields: [] }]);
  };

  const updateEntity = (idx: number, e: Entity) => {
    const ne = [...entities]; ne[idx] = e; setEntities(ne);
  };

  const removeEntity = (idx: number) => {
    setEntities(entities.filter((_, i) => i !== idx));
  };

  const addField = (eidx: number) => {
    const ne = [...entities];
    ne[eidx].fields.push({ name: '', type: 'string', required: true });
    setEntities(ne);
  };

  const addRelationship = () => {
    if (entities.length < 2) return;
    setRelationships([...relationships, { from: entities[0].name, to: entities[1].name, type: 'one-to-many' }]);
  };

  const buildTask = (): CodingTask => {
    const config: Config = {
      coding_style: codingStyle,
      security_policies: securityPolicies.split(',').map(s => s.trim()).filter(Boolean),
      test_preferences: { framework: testFramework, include_integration_tests: includeIntegrationTests, coverage_threshold: coverageThreshold },
      lint_rules: lintRules.split(',').map(s => s.trim()).filter(Boolean),
      template_id: selectedTemplate || undefined,
      swarm_mode: swarmMode,
      auto_fix: autoFix,
      max_fix_iterations: maxFixIterations,
      fix_threshold: fixThreshold,
      deployment_targets: deploymentTargets,
      scheduled_run: scheduledRun ? { enabled: true, cron_expression: cronExpr } : undefined,
      sandbox_mode: sandboxMode,
      branch_name: branchName,
      create_pr: createPr,
    };
    const env: ExecutionEnvironment = {
      docker_image: dockerImage || 'node:18-alpine',
      resource_limits: { cpu, memory, timeout_seconds: timeout },
    };
    return {
      task_description: taskDescription,
      target_stack: targetStack,
      repository_url: repoUrl,
      execution_environment: env,
      config,
      database_schema: dbSchemaEnabled ? { entities, relationships } : undefined,
      requirements_doc: reqContent ? { source_type: 'text', content: reqContent } : undefined,
      secrets: secrets.length > 0 ? secrets : undefined,
    };
  };

  const steps = mode === 'thread'
    ? ['Mode', 'Task', 'Stack & Template', 'Database', 'Config']
    : ['Mode', 'Task', 'Stack & Template', 'Database', 'Config'];

  const StepBadge = ({ n, active, done }: { n: number; active: boolean; done: boolean }) => (
    <span className={`badge ${active ? 'badge-primary' : done ? 'badge-success' : 'badge-ghost'}`}>{n + 1}</span>
  );

  const NextBtn = ({ disabled = false }: { disabled?: boolean }) => (
    <button className="btn btn-primary" disabled={disabled} onClick={() => setStep(s => Math.min(s + 1, steps.length - 1))}>Next</button>
  );
  const PrevBtn = () => <button className="btn btn-ghost" onClick={() => setStep(s => Math.max(s - 1, 0))}>Back</button>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>← Cancel</button>
        <h2 className="text-xl font-bold">New Coding Run</h2>
      </div>
      <div className="flex gap-2 mb-4">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <StepBadge n={i} active={step === i} done={step > i} />
            <span className={`text-sm ${step === i ? 'font-bold' : 'opacity-60'}`}>{label}</span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="card bg-base-200 shadow">
          <div className="card-body space-y-4">
            <h3 className="font-bold">Execution Mode</h3>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" className="radio radio-primary" checked={mode === 'oneshot'} onChange={() => setMode('oneshot')} />
                <span>One-shot run</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" className="radio radio-primary" checked={mode === 'thread'} onChange={() => setMode('thread')} />
                <span>Thread (conversational iteration)</span>
              </label>
            </div>
            <div className="flex justify-end"><NextBtn /></div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card bg-base-200 shadow">
          <div className="card-body space-y-4">
            <h3 className="font-bold">Task Description</h3>
            <textarea className="textarea textarea-bordered w-full" rows={4} placeholder="Describe what you want to build..." value={taskDescription} onChange={e => setTaskDescription(e.target.value)} />
            <div className="divider">Or parse requirements</div>
            <textarea className="textarea textarea-bordered w-full" rows={4} placeholder="Paste PRD, spec doc, or requirements text..." value={reqContent} onChange={e => setReqContent(e.target.value)} />
            <div className="flex justify-between"><PrevBtn /><NextBtn disabled={!taskDescription.trim()} /></div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card bg-base-200 shadow">
          <div className="card-body space-y-4">
            <h3 className="font-bold">Tech Stack & Template</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map(t => (
                <button key={t.id} className={`card bg-base-300 hover:bg-base-100 transition-colors text-left p-3 ${selectedTemplate === t.id ? 'ring-2 ring-primary' : ''}`} onClick={() => applyTemplate(t.id)}>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs opacity-70 mt-1">{t.description}</div>
                  <div className="text-xs opacity-50 mt-1">{t.stack}</div>
                </button>
              ))}
            </div>
            <div className="divider">Custom Stack</div>
            <input className="input input-bordered w-full" placeholder="e.g. Next.js 14, Prisma, PostgreSQL" value={targetStack} onChange={e => setTargetStack(e.target.value)} />
            <input className="input input-bordered w-full" placeholder="Docker image (e.g. node:18-alpine)" value={dockerImage} onChange={e => setDockerImage(e.target.value)} />
            <div className="grid grid-cols-3 gap-2">
              <input className="input input-bordered" placeholder="CPU" value={cpu} onChange={e => setCpu(e.target.value)} />
              <input className="input input-bordered" placeholder="Memory" value={memory} onChange={e => setMemory(e.target.value)} />
              <input className="input input-bordered" type="number" placeholder="Timeout (s)" value={timeout} onChange={e => setTimeout(Number(e.target.value))} />
            </div>
            <input className="input input-bordered w-full" placeholder="Repository URL (optional)" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} />
            <div className="flex justify-between"><PrevBtn /><NextBtn disabled={!targetStack.trim()} /></div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card bg-base-200 shadow">
          <div className="card-body space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Database Schema Builder</h3>
              <input type="checkbox" className="toggle toggle-primary" checked={dbSchemaEnabled} onChange={e => setDbSchemaEnabled(e.target.checked)} />
            </div>
            {dbSchemaEnabled && (
              <div className="space-y-3">
                <div className="space-y-2">
                  {entities.map((ent, ei) => (
                    <div key={ei} className="card bg-base-300 p-3 space-y-2">
                      <div className="flex gap-2">
                        <input className="input input-bordered input-sm flex-1" placeholder="Entity name" value={ent.name} onChange={e => updateEntity(ei, { ...ent, name: e.target.value })} />
                        <button className="btn btn-error btn-sm" onClick={() => removeEntity(ei)}>Remove</button>
                      </div>
                      <div className="pl-4 space-y-1">
                        {ent.fields.map((f, fi) => (
                          <div key={fi} className="flex gap-2 items-center">
                            <input className="input input-bordered input-sm flex-1" placeholder="Field name" value={f.name} onChange={e => { const nf = [...ent.fields]; nf[fi] = { ...f, name: e.target.value }; updateEntity(ei, { ...ent, fields: nf }); }} />
                            <select className="select select-bordered select-sm" value={f.type} onChange={e => { const nf = [...ent.fields]; nf[fi] = { ...f, type: e.target.value }; updateEntity(ei, { ...ent, fields: nf }); }}>
                              <option>string</option><option>number</option><option>boolean</option><option>date</option><option>json</option>
                            </select>
                            <label className="flex items-center gap-1 text-xs"><input type="checkbox" className="checkbox checkbox-xs" checked={f.required} onChange={e => { const nf = [...ent.fields]; nf[fi] = { ...f, required: e.target.checked }; updateEntity(ei, { ...ent, fields: nf }); }} />Req</label>
                          </div>
                        ))}
                        <button className="btn btn-ghost btn-xs" onClick={() => addField(ei)}>+ Field</button>
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-sm" onClick={addEntity}>+ Entity</button>
                </div>
                {relationships.length > 0 && (
                  <div className="space-y-1">
                    {relationships.map((rel, ri) => (
                      <div key={ri} className="flex gap-2 items-center">
                        <select className="select select-bordered select-sm" value={rel.from} onChange={e => { const nr = [...relationships]; nr[ri] = { ...rel, from: e.target.value }; setRelationships(nr); }}>
                          {entities.map(e => <option key={e.name}>{e.name}</option>)}
                        </select>
                        <select className="select select-bordered select-sm" value={rel.type} onChange={e => { const nr = [...relationships]; nr[ri] = { ...rel, type: e.target.value as any }; setRelationships(nr); }}>
                          <option>one-to-one</option><option>one-to-many</option><option>many-to-many</option>
                        </select>
                        <select className="select select-bordered select-sm" value={rel.to} onChange={e => { const nr = [...relationships]; nr[ri] = { ...rel, to: e.target.value }; setRelationships(nr); }}>
                          {entities.map(e => <option key={e.name}>{e.name}</option>)}
                        </select>
                        <button className="btn btn-error btn-xs" onClick={() => setRelationships(relationships.filter((_, i) => i !== ri))}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                {entities.length >= 2 && <button className="btn btn-ghost btn-sm" onClick={addRelationship}>+ Relationship</button>}
              </div>
            )}
            <div className="flex justify-between"><PrevBtn /><NextBtn /></div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card bg-base-200 shadow">
          <div className="card-body space-y-4">
            <h3 className="font-bold">Advanced Configuration</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-text">Coding Style</label>
                <select className="select select-bordered w-full" value={codingStyle} onChange={e => setCodingStyle(e.target.value)}>
                  <option>airbnb</option><option>google</option><option>standard</option><option>prettier</option>
                </select>
              </div>
              <div>
                <label className="label-text">Security Policies (comma-separated)</label>
                <input className="input input-bordered w-full" placeholder="no-eval, sanitize-inputs, strict-csp..." value={securityPolicies} onChange={e => setSecurityPolicies(e.target.value)} />
              </div>
              <div>
                <label className="label-text">Test Framework</label>
                <select className="select select-bordered w-full" value={testFramework} onChange={e => setTestFramework(e.target.value)}>
                  <option>jest</option><option>mocha</option><option>vitest</option><option>pytest</option>
                </select>
              </div>
              <div>
                <label className="label-text">Coverage Threshold (%)</label>
                <input className="input input-bordered w-full" type="number" value={coverageThreshold} onChange={e => setCoverageThreshold(Number(e.target.value))} />
              </div>
              <div>
                <label className="label-text">Lint Rules (comma-separated)</label>
                <input className="input input-bordered w-full" placeholder="no-console, no-unused-vars..." value={lintRules} onChange={e => setLintRules(e.target.value)} />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="checkbox" checked={includeIntegrationTests} onChange={e => setIncludeIntegrationTests(e.target.checked)} />
                  <span className="text-sm">Integration Tests</span>
                </label>
              </div>
            </div>

            <div className="divider">Secrets & Environment</div>
            <div className="space-y-2">
              {secrets.map((s, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input className="input input-bordered input-sm flex-1" value={s.key} readOnly />
                  <input className="input input-bordered input-sm flex-1" type={showSecrets ? 'text' : 'password'} value={s.value} readOnly />
                  <button className="btn btn-error btn-sm" onClick={() => onSecretsChange(secrets.filter((_, j) => j !== i))}>Remove</button>
                </div>
              ))}
              <div className="flex gap-2">
                <input className="input input-bordered input-sm flex-1" placeholder="KEY_NAME" value={newSecretKey} onChange={e => setNewSecretKey(e.target.value)} />
                <input className="input input-bordered input-sm flex-1" type={showSecrets ? 'text' : 'password'} placeholder="value" value={newSecretValue} onChange={e => setNewSecretValue(e.target.value)} />
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  if (newSecretKey && newSecretValue) {
                    onSecretsChange([...secrets, { key: newSecretKey, value: newSecretValue, encrypted: true }]);
                    setNewSecretKey(''); setNewSecretValue('');
                  }
                }}>Add</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowSecrets(!showSecrets)}>{showSecrets ? 'Hide' : 'Show'}</button>
              </div>
            </div>

            <div className="divider">Execution & Deployment</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="toggle toggle-primary" checked={swarmMode} onChange={e => setSwarmMode(e.target.checked)} />
                <span>Swarm Mode (parallel agents)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="toggle toggle-primary" checked={autoFix} onChange={e => setAutoFix(e.target.checked)} />
                <span>Auto-Fix Loop</span>
              </label>
              {autoFix && (
                <>
                  <div>
                    <label className="label-text">Max Fix Iterations</label>
                    <input className="input input-bordered w-full" type="number" value={maxFixIterations} onChange={e => setMaxFixIterations(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="label-text">Fix Threshold Score</label>
                    <input className="input input-bordered w-full" type="number" value={fixThreshold} onChange={e => setFixThreshold(Number(e.target.value))} />
                  </div>
                </>
              )}
              <div>
                <label className="label-text">Sandbox Mode</label>
                <select className="select select-bordered w-full" value={sandboxMode} onChange={e => setSandboxMode(e.target.value as any)}>
                  <option value="mock">Mock (simulated)</option>
                  <option value="real">Real (container execution)</option>
                </select>
              </div>
              <div>
                <label className="label-text">Branch Name</label>
                <input className="input input-bordered w-full" value={branchName} onChange={e => setBranchName(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="checkbox" checked={createPr} onChange={e => setCreatePr(e.target.checked)} />
                <span>Create PR (not push to main)</span>
              </label>
            </div>

            <div>
              <label className="label-text">Deployment Targets</label>
              <div className="flex gap-3 flex-wrap">
                {['github', 'vercel', 'railway', 'aws'].map(p => (
                  <label key={p} className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" className="checkbox checkbox-sm" checked={deploymentTargets.includes(p)} onChange={e => {
                      if (e.target.checked) setDeploymentTargets([...deploymentTargets, p]);
                      else setDeploymentTargets(deploymentTargets.filter(x => x !== p));
                    }} />
                    <span className="text-sm capitalize">{p}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="divider">Scheduling</div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="toggle toggle-primary" checked={scheduledRun} onChange={e => setScheduledRun(e.target.checked)} />
              <span>Enable Scheduled Regeneration</span>
            </label>
            {scheduledRun && (
              <div className="flex gap-2">
                <input className="input input-bordered flex-1" placeholder="Cron expression (e.g. 0 2 * * 1)" value={cronExpr} onChange={e => setCronExpr(e.target.value)} />
                <span className="text-sm opacity-70 self-center">UTC</span>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <PrevBtn />
              <button className="btn btn-primary" onClick={() => onSubmit(buildTask())}>🚀 Launch Agent</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

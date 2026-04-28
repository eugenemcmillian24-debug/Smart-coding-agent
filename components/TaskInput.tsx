import React, { useState, useRef } from 'react';
import { CodingTask, Config, ExecutionEnvironment, DatabaseSchema, Entity, Relationship, RequirementsDoc, Template } from '../types';

interface Props {
  onSubmit: (task: CodingTask) => void;
  onCancel: () => void;
  templates: Template[];
}

const DEFAULT_CONFIG: Config = {
  coding_style: 'airbnb',
  security_policies: ['no-eval', 'sanitize-inputs'],
  test_preferences: {
    framework: 'jest',
    include_integration_tests: false,
    coverage_threshold: 80,
  },
  lint_rules: [],
  auto_fix: false,
  max_fix_iterations: 3,
  fix_threshold: 85,
  swarm_mode: false,
  deployment_targets: ['github'],
};

const DEFAULT_ENV: ExecutionEnvironment = {
  docker_image: 'node:18-alpine',
  resource_limits: {
    cpu: '1',
    memory: '512Mi',
    timeout_seconds: 300,
  },
};

const emptySchema: DatabaseSchema = { entities: [], relationships: [] };

export function TaskInput({ onSubmit, onCancel, templates }: Props) {
  const [step, setStep] = useState(1);
  const [task, setTask] = useState<CodingTask>({
    task_description: '',
    target_stack: '',
    repository_url: '',
    execution_environment: { ...DEFAULT_ENV },
    config: { ...DEFAULT_CONFIG },
    database_schema: undefined,
    requirements_doc: undefined,
  });
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [schemaMode, setSchemaMode] = useState(false);
  const [schema, setSchema] = useState<DatabaseSchema>(emptySchema);
  const [newEntity, setNewEntity] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('string');
  const [reqDoc, setReqDoc] = useState('');
  const [reqType, setReqType] = useState<'upload' | 'text'>('text');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [cronExpr, setCronExpr] = useState('0 9 * * 1');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof CodingTask>(key: K, value: CodingTask[K]) => {
    setTask(prev => ({ ...prev, [key]: value }));
  };
  const updateConfig = (patch: Partial<Config>) => setTask(prev => ({ ...prev, config: { ...prev.config, ...patch } }));
  const updateEnv = (patch: Partial<ExecutionEnvironment>) => setTask(prev => ({ ...prev, execution_environment: { ...prev.execution_environment, ...patch } }));
  const updateResourceLimits = (patch: Partial<ExecutionEnvironment['resource_limits']>) => setTask(prev => ({ ...prev, execution_environment: { ...prev.execution_environment, resource_limits: { ...prev.execution_environment.resource_limits, ...patch } } }));

  const applyTemplate = (t: Template) => {
    setSelectedTemplate(t.id);
    setTask(prev => ({
      ...prev,
      target_stack: t.stack,
      execution_environment: { ...t.default_env },
      config: { ...prev.config, ...t.default_config, template_id: t.id },
    }));
  };

  const addEntity = () => {
    if (!newEntity.trim()) return;
    setSchema(prev => ({ ...prev, entities: [...prev.entities, { name: newEntity.trim(), fields: [] }] }));
    setNewEntity('');
  };

  const addField = (entityIdx: number) => {
    if (!newFieldName.trim()) return;
    setSchema(prev => {
      const ents = [...prev.entities];
      ents[entityIdx] = { ...ents[entityIdx], fields: [...ents[entityIdx].fields, { name: newFieldName.trim(), type: newFieldType, required: true }] };
      return { ...prev, entities: ents };
    });
    setNewFieldName('');
  };

  const addRelation = (from: string, to: string, type: Relationship['type']) => {
    setSchema(prev => ({ ...prev, relationships: [...prev.relationships, { from, to, type }] }));
  };

  const removeEntity = (idx: number) => {
    setSchema(prev => {
      const ent = prev.entities[idx];
      return {
        entities: prev.entities.filter((_, i) => i !== idx),
        relationships: prev.relationships.filter(r => r.from !== ent.name && r.to !== ent.name),
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setReqDoc(text);
    setReqType('upload');
  };

  const estimateCost = () => {
    const taskLen = task.task_description.length;
    const stackLen = task.target_stack.length;
    const schemaBonus = schema.entities.length * 200;
    const swarmBonus = task.config.swarm_mode ? 4 : 1;
    const fixBonus = task.config.auto_fix ? (task.config.max_fix_iterations || 3) : 1;
    const inputTokens = Math.round(((taskLen + stackLen) / 4 + 500 + schemaBonus) * swarmBonus * fixBonus);
    const outputTokens = Math.round(inputTokens * 0.8);
    const cost = (inputTokens / 1000 * 0.0015) + (outputTokens / 1000 * 0.002);
    return { inputTokens, outputTokens, cost: Math.round(cost * 1000) / 1000 };
  };

  const canNext = () => {
    if (step === 1) return task.task_description.trim().length > 0;
    if (step === 2) return task.target_stack.trim().length > 0;
    return true;
  };

  const handleSubmit = () => {
    const finalTask: CodingTask = {
      ...task,
      database_schema: schemaMode && schema.entities.length > 0 ? schema : undefined,
      requirements_doc: reqDoc ? { source_type: reqType, content: reqDoc, extracted_specs: reqDoc.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*')) } : undefined,
      config: {
        ...task.config,
        scheduled_run: scheduleEnabled ? { enabled: true, cron_expression: cronExpr, timezone: 'UTC' } : undefined,
      },
    };
    onSubmit(finalTask);
  };

  const cost = estimateCost();

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">New Coding Agent Run</h2>
        <ul className="steps steps-sm mb-4">
          <li className={`step ${step >= 1 ? 'step-primary' : ''}`}>Task</li>
          <li className={`step ${step >= 2 ? 'step-primary' : ''}`}>Stack</li>
          <li className={`step ${step >= 3 ? 'step-primary' : ''}`}>Environment</li>
          <li className={`step ${step >= 4 ? 'step-primary' : ''}`}>Config</li>
          <li className={`step ${step >= 5 ? 'step-primary' : ''}`}>Advanced</li>
        </ul>

        {step === 1 && (
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Task Description</span></label>
              <textarea className="textarea textarea-bordered h-32" placeholder="Describe the feature or app to build..." value={task.task_description} onChange={e => update('task_description', e.target.value)} />
            </div>
            <div className="card bg-base-300 p-4">
              <h3 className="font-bold text-sm mb-2">Or pick a template</h3>
              <div className="grid grid-cols-2 gap-2">
                {templates.map(t => (
                  <button key={t.id} className={`btn btn-sm ${selectedTemplate === t.id ? 'btn-primary' : 'btn-outline'}`} onClick={() => applyTemplate(t)}>
                    {t.name}
                  </button>
                ))}
              </div>
              {selectedTemplate && (
                <p className="text-xs mt-2 opacity-70">Template: {templates.find(t => t.id === selectedTemplate)?.description}</p>
              )}
            </div>
            <div className="card bg-base-300 p-4">
              <h3 className="font-bold text-sm mb-2">Requirements Document (optional)</h3>
              <div className="flex gap-2 mb-2">
                <button className={`btn btn-xs ${reqType === 'text' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setReqType('text')}>Paste Text</button>
                <button className={`btn btn-xs ${reqType === 'upload' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setReqType('upload'); fileInputRef.current?.click(); }}>Upload File</button>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept=".md,.txt,.pdf" onChange={handleFileUpload} />
              {reqType === 'text' ? (
                <textarea className="textarea textarea-bordered h-24 text-sm" placeholder="Paste PRD, Notion doc, or requirements..." value={reqDoc} onChange={e => setReqDoc(e.target.value)} />
              ) : reqDoc ? (
                <div className="text-xs bg-base-100 p-2 rounded max-h-24 overflow-auto">{reqDoc.substring(0, 500)}{reqDoc.length > 500 ? '...' : ''}</div>
              ) : (
                <p className="text-xs opacity-50">No file uploaded</p>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Target Stack</span></label>
              <input className="input input-bordered" placeholder="e.g. Node.js + Express backend, React frontend" value={task.target_stack} onChange={e => update('target_stack', e.target.value)} />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Repository URL (optional)</span></label>
              <input className="input input-bordered" placeholder="https://github.com/user/repo" value={task.repository_url} onChange={e => update('repository_url', e.target.value)} />
            </div>
            <div className="card bg-base-300 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">Database Schema (optional)</h3>
                <input type="checkbox" className="toggle toggle-sm" checked={schemaMode} onChange={e => setSchemaMode(e.target.checked)} />
              </div>
              {schemaMode && (
                <div className="mt-3 space-y-3">
                  <div className="flex gap-2">
                    <input className="input input-bordered input-sm flex-1" placeholder="Entity name (e.g. User)" value={newEntity} onChange={e => setNewEntity(e.target.value)} />
                    <button className="btn btn-sm btn-primary" onClick={addEntity}>Add</button>
                  </div>
                  {schema.entities.map((ent, ei) => (
                    <div key={ent.name} className="bg-base-100 rounded p-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{ent.name}</span>
                        <button className="btn btn-xs btn-ghost text-error" onClick={() => removeEntity(ei)}>×</button>
                      </div>
                      <div className="flex gap-1 mt-1">
                        <input className="input input-bordered input-xs flex-1" placeholder="Field name" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} />
                        <select className="select select-bordered select-xs" value={newFieldType} onChange={e => setNewFieldType(e.target.value)}>
                          <option>string</option><option>number</option><option>boolean</option><option>date</option><option>text</option><option>json</option>
                        </select>
                        <button className="btn btn-xs btn-secondary" onClick={() => addField(ei)}>+</button>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {ent.fields.map(f => (
                          <span key={f.name} className="badge badge-sm badge-outline">{f.name}: {f.type}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {schema.entities.length > 1 && (
                    <div className="flex gap-2">
                      <select className="select select-bordered select-xs" onChange={e => { const [from, to] = e.target.value.split('->'); if (from && to) addRelation(from, to, 'one-to-many'); }}>
                        <option value="">Add relationship...</option>
                        {schema.entities.map((a, i) => schema.entities.slice(i + 1).map(b => (
                          <option key={`${a.name}->${b.name}`} value={`${a.name}->${b.name}`}>{a.name} → {b.name}</option>
                        )))}
                      </select>
                    </div>
                  )}
                  {schema.relationships.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {schema.relationships.map((r, i) => (
                        <span key={i} className="badge badge-sm badge-accent">{r.from} {r.type.replace(/-/g, ' ')} {r.to}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Docker Image</span></label>
              <input className="input input-bordered" placeholder="e.g. node:18-alpine" value={task.execution_environment.docker_image || ''} onChange={e => updateEnv({ docker_image: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="form-control">
                <label className="label"><span className="label-text">CPU</span></label>
                <input className="input input-bordered" placeholder="1" value={task.execution_environment.resource_limits?.cpu || ''} onChange={e => updateResourceLimits({ cpu: e.target.value })} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Memory</span></label>
                <input className="input input-bordered" placeholder="512Mi" value={task.execution_environment.resource_limits?.memory || ''} onChange={e => updateResourceLimits({ memory: e.target.value })} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Timeout (s)</span></label>
                <input className="input input-bordered" type="number" placeholder="300" value={task.execution_environment.resource_limits?.timeout_seconds || ''} onChange={e => updateResourceLimits({ timeout_seconds: Number(e.target.value) })} />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Coding Style</span></label>
              <select className="select select-bordered" value={task.config.coding_style || ''} onChange={e => updateConfig({ coding_style: e.target.value })}>
                <option value="airbnb">Airbnb</option><option value="google">Google</option><option value="standard">StandardJS</option><option value="prettier">Prettier</option><option value="none">None</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Security Policies (comma-separated)</span></label>
              <input className="input input-bordered" placeholder="no-eval, sanitize-inputs, strict-csp" value={(task.config.security_policies || []).join(', ')} onChange={e => updateConfig({ security_policies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
            </div>
            <div className="card bg-base-300 p-4 space-y-3">
              <h3 className="font-bold text-sm">Test Preferences</h3>
              <div className="form-control">
                <label className="label"><span className="label-text">Framework</span></label>
                <select className="select select-bordered select-sm" value={task.config.test_preferences?.framework || ''} onChange={e => updateConfig({ test_preferences: { ...task.config.test_preferences, framework: e.target.value } })}>
                  <option value="jest">Jest</option><option value="mocha">Mocha</option><option value="vitest">Vitest</option><option value="pytest">Pytest</option><option value="unittest">unittest</option><option value="go-test">Go Test</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input type="checkbox" className="checkbox checkbox-sm" checked={task.config.test_preferences?.include_integration_tests || false} onChange={e => updateConfig({ test_preferences: { ...task.config.test_preferences, include_integration_tests: e.target.checked } })} />
                  <span className="label-text">Include Integration Tests</span>
                </label>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Coverage Threshold (%)</span></label>
                <input type="number" className="input input-bordered input-sm" min={0} max={100} value={task.config.test_preferences?.coverage_threshold || ''} onChange={e => updateConfig({ test_preferences: { ...task.config.test_preferences, coverage_threshold: Number(e.target.value) } })} />
              </div>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Lint Rules (comma-separated)</span></label>
              <input className="input input-bordered" placeholder="no-console, prefer-const" value={(task.config.lint_rules || []).join(', ')} onChange={e => updateConfig({ lint_rules: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div className="card bg-base-300 p-4 space-y-3">
              <h3 className="font-bold text-sm">Advanced Options</h3>
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input type="checkbox" className="toggle toggle-sm" checked={task.config.swarm_mode || false} onChange={e => updateConfig({ swarm_mode: e.target.checked })} />
                  <span className="label-text font-semibold">Swarm Mode</span>
                </label>
                <p className="text-xs opacity-70 ml-12">Spawn parallel agents (Frontend, Backend, DevOps, Database) for faster generation</p>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input type="checkbox" className="toggle toggle-sm" checked={task.config.auto_fix || false} onChange={e => updateConfig({ auto_fix: e.target.checked })} />
                  <span className="label-text font-semibold">Auto-Fix Loop</span>
                </label>
                <p className="text-xs opacity-70 ml-12">Automatically regenerate fixes when review score is below threshold</p>
              </div>
              {task.config.auto_fix && (
                <div className="grid grid-cols-2 gap-3 ml-12">
                  <div className="form-control">
                    <label className="label"><span className="label-text text-xs">Max Iterations</span></label>
                    <input type="number" className="input input-bordered input-sm" min={1} max={10} value={task.config.max_fix_iterations || 3} onChange={e => updateConfig({ max_fix_iterations: Number(e.target.value) })} />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text text-xs">Quality Threshold</span></label>
                    <input type="number" className="input input-bordered input-sm" min={50} max={100} value={task.config.fix_threshold || 85} onChange={e => updateConfig({ fix_threshold: Number(e.target.value) })} />
                  </div>
                </div>
              )}
              <div className="form-control">
                <label className="label"><span className="label-text">Deployment Targets</span></label>
                <div className="flex flex-wrap gap-2">
                  {['github', 'vercel', 'railway', 'aws'].map(p => (
                    <label key={p} className="label cursor-pointer gap-1">
                      <input type="checkbox" className="checkbox checkbox-sm" checked={(task.config.deployment_targets || []).includes(p)} onChange={e => {
                        const current = task.config.deployment_targets || ['github'];
                        updateConfig({ deployment_targets: e.target.checked ? [...current, p] : current.filter(x => x !== p) });
                      }} />
                      <span className="label-text text-sm capitalize">{p}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input type="checkbox" className="toggle toggle-sm" checked={scheduleEnabled} onChange={e => setScheduleEnabled(e.target.checked)} />
                  <span className="label-text font-semibold">Scheduled Regeneration</span>
                </label>
                {scheduleEnabled && (
                  <div className="ml-12 mt-2">
                    <label className="label"><span className="label-text text-xs">Cron Expression</span></label>
                    <input className="input input-bordered input-sm w-full" placeholder="0 9 * * 1" value={cronExpr} onChange={e => setCronExpr(e.target.value)} />
                    <p className="text-xs opacity-50 mt-1">Example: 0 9 * * 1 = Every Monday at 9am UTC</p>
                  </div>
                )}
              </div>
            </div>
            <div className="card bg-base-300 p-4">
              <h3 className="font-bold text-sm mb-2">Cost Estimate</h3>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div><div className="font-bold text-lg text-primary">{cost.inputTokens.toLocaleString()}</div><div className="opacity-70">Input tokens</div></div>
                <div><div className="font-bold text-lg text-primary">{cost.outputTokens.toLocaleString()}</div><div className="opacity-70">Output tokens</div></div>
                <div><div className="font-bold text-lg text-success">~${cost.cost.toFixed(3)}</div><div className="opacity-70">Est. cost</div></div>
              </div>
            </div>
          </div>
        )}

        <div className="card-actions justify-end mt-4">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          {step > 1 && <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>Back</button>}
          {step < 5 ? (
            <button className="btn btn-primary" disabled={!canNext()} onClick={() => setStep(step + 1)}>Next</button>
          ) : (
            <button className="btn btn-primary" onClick={handleSubmit}>Run Agent (~${cost.cost.toFixed(3)})</button>
          )}
        </div>
      </div>
    </div>
  );
}

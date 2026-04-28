import React, { useState } from 'react';
import { CodingTask, Config, ExecutionEnvironment } from '../types';

interface Props {
  onSubmit: (task: CodingTask) => void;
  onCancel: () => void;
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
};

const DEFAULT_ENV: ExecutionEnvironment = {
  docker_image: 'node:18-alpine',
  resource_limits: {
    cpu: '1',
    memory: '512Mi',
    timeout_seconds: 300,
  },
};

export function TaskInput({ onSubmit, onCancel }: Props) {
  const [step, setStep] = useState(1);
  const [task, setTask] = useState<CodingTask>({
    task_description: '',
    target_stack: '',
    repository_url: '',
    execution_environment: { ...DEFAULT_ENV },
    config: { ...DEFAULT_CONFIG },
  });

  const update = <K extends keyof CodingTask>(key: K, value: CodingTask[K]) => {
    setTask((prev) => ({ ...prev, [key]: value }));
  };

  const updateConfig = (patch: Partial<Config>) => {
    setTask((prev) => ({ ...prev, config: { ...prev.config, ...patch } }));
  };

  const updateEnv = (patch: Partial<ExecutionEnvironment>) => {
    setTask((prev) => ({ ...prev, execution_environment: { ...prev.execution_environment, ...patch } }));
  };

  const updateResourceLimits = (patch: Partial<ExecutionEnvironment['resource_limits']>) => {
    setTask((prev) => ({
      ...prev,
      execution_environment: {
        ...prev.execution_environment,
        resource_limits: { ...prev.execution_environment.resource_limits, ...patch },
      },
    }));
  };

  const canNext = () => {
    if (step === 1) return task.task_description.trim().length > 0;
    if (step === 2) return task.target_stack.trim().length > 0;
    return true;
  };

  const handleSubmit = () => {
    onSubmit(task);
  };

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">New Coding Agent Run</h2>
        <ul className="steps steps-sm mb-4">
          <li className={`step ${step >= 1 ? 'step-primary' : ''}`}>Task</li>
          <li className={`step ${step >= 2 ? 'step-primary' : ''}`}>Stack</li>
          <li className={`step ${step >= 3 ? 'step-primary' : ''}`}>Environment</li>
          <li className={`step ${step >= 4 ? 'step-primary' : ''}`}>Config</li>
        </ul>

        {step === 1 && (
          <div className="form-control">
            <label className="label"><span className="label-text">Task Description</span></label>
            <textarea
              className="textarea textarea-bordered h-32"
              placeholder="Describe the feature or app to build..."
              value={task.task_description}
              onChange={(e) => update('task_description', e.target.value)}
            />
          </div>
        )}

        {step === 2 && (
          <div className="form-control">
            <label className="label"><span className="label-text">Target Stack</span></label>
            <input
              className="input input-bordered"
              placeholder="e.g. Node.js + Express backend, React frontend"
              value={task.target_stack}
              onChange={(e) => update('target_stack', e.target.value)}
            />
            <div className="form-control mt-3">
              <label className="label"><span className="label-text">Repository URL (optional)</span></label>
              <input
                className="input input-bordered"
                placeholder="https://github.com/user/repo"
                value={task.repository_url}
                onChange={(e) => update('repository_url', e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Docker Image</span></label>
              <input
                className="input input-bordered"
                placeholder="e.g. node:18-alpine, python:3.11-slim"
                value={task.execution_environment.docker_image || ''}
                onChange={(e) => updateEnv({ docker_image: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="form-control">
                <label className="label"><span className="label-text">CPU</span></label>
                <input
                  className="input input-bordered"
                  placeholder="1"
                  value={task.execution_environment.resource_limits?.cpu || ''}
                  onChange={(e) => updateResourceLimits({ cpu: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Memory</span></label>
                <input
                  className="input input-bordered"
                  placeholder="512Mi"
                  value={task.execution_environment.resource_limits?.memory || ''}
                  onChange={(e) => updateResourceLimits({ memory: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Timeout (s)</span></label>
                <input
                  className="input input-bordered"
                  type="number"
                  placeholder="300"
                  value={task.execution_environment.resource_limits?.timeout_seconds || ''}
                  onChange={(e) => updateResourceLimits({ timeout_seconds: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Coding Style</span></label>
              <select
                className="select select-bordered"
                value={task.config.coding_style || ''}
                onChange={(e) => updateConfig({ coding_style: e.target.value })}
              >
                <option value="airbnb">Airbnb</option>
                <option value="google">Google</option>
                <option value="standard">StandardJS</option>
                <option value="prettier">Prettier</option>
                <option value="none">None</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Security Policies (comma-separated)</span></label>
              <input
                className="input input-bordered"
                placeholder="no-eval, sanitize-inputs, strict-csp"
                value={(task.config.security_policies || []).join(', ')}
                onChange={(e) => updateConfig({ security_policies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              />
            </div>

            <div className="card bg-base-300 p-4 space-y-3">
              <h3 className="font-bold text-sm">Test Preferences</h3>
              <div className="form-control">
                <label className="label"><span className="label-text">Framework</span></label>
                <select
                  className="select select-bordered select-sm"
                  value={task.config.test_preferences?.framework || ''}
                  onChange={(e) =>
                    updateConfig({
                      test_preferences: { ...task.config.test_preferences, framework: e.target.value },
                    })
                  }
                >
                  <option value="jest">Jest</option>
                  <option value="mocha">Mocha</option>
                  <option value="vitest">Vitest</option>
                  <option value="pytest">Pytest</option>
                  <option value="unittest">unittest</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={task.config.test_preferences?.include_integration_tests || false}
                    onChange={(e) =>
                      updateConfig({
                        test_preferences: { ...task.config.test_preferences, include_integration_tests: e.target.checked },
                      })
                    }
                  />
                  <span className="label-text">Include Integration Tests</span>
                </label>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Coverage Threshold (%)</span></label>
                <input
                  type="number"
                  className="input input-bordered input-sm"
                  min={0}
                  max={100}
                  value={task.config.test_preferences?.coverage_threshold || ''}
                  onChange={(e) =>
                    updateConfig({
                      test_preferences: { ...task.config.test_preferences, coverage_threshold: Number(e.target.value) },
                    })
                  }
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Additional Lint Rules (comma-separated)</span></label>
              <input
                className="input input-bordered"
                placeholder="e.g. no-console, prefer-const"
                value={(task.config.lint_rules || []).join(', ')}
                onChange={(e) => updateConfig({ lint_rules: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              />
            </div>
          </div>
        )}

        <div className="card-actions justify-end mt-4">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          {step > 1 && <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>Back</button>}
          {step < 4 ? (
            <button className="btn btn-primary" disabled={!canNext()} onClick={() => setStep(step + 1)}>Next</button>
          ) : (
            <button className="btn btn-primary" onClick={handleSubmit}>Run Agent</button>
          )}
        </div>
      </div>
    </div>
  );
}

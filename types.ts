export interface Config {
  coding_style?: string;
  security_policies?: string[];
  test_preferences?: {
    framework?: string;
    include_integration_tests?: boolean;
    coverage_threshold?: number;
  };
  lint_rules?: string[];
  template_id?: string;
  swarm_mode?: boolean;
  auto_fix?: boolean;
  max_fix_iterations?: number;
  fix_threshold?: number;
  deployment_targets?: string[];
  scheduled_run?: ScheduledRunConfig;
}

export interface ExecutionEnvironment {
  docker_image?: string;
  resource_limits?: {
    cpu?: string;
    memory?: string;
    timeout_seconds?: number;
  };
}

export interface Entity {
  name: string;
  fields: { name: string; type: string; required: boolean; default?: string }[];
}

export interface Relationship {
  from: string;
  to: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface DatabaseSchema {
  entities: Entity[];
  relationships: Relationship[];
}

export interface RequirementsDoc {
  source_type: 'upload' | 'text';
  content: string;
  extracted_specs?: string[];
}

export interface CodingTask {
  task_description: string;
  target_stack: string;
  repository_url: string;
  execution_environment: ExecutionEnvironment;
  config: Config;
  database_schema?: DatabaseSchema;
  requirements_doc?: RequirementsDoc;
}

export interface SourceFile {
  filename: string;
  language: string;
  content: string;
}

export interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line: number;
  description: string;
  cwe_id?: string;
  remediation?: string;
}

export interface ReviewReport {
  quality_score: number;
  overall_status: 'pass' | 'warn' | 'fail';
  security_issues: SecurityIssue[];
  suggestions: string[];
  style_violations?: string[];
  test_coverage?: number;
}

export interface ExecutionResults {
  success: boolean;
  logs: string[];
  error_message?: string;
  duration_ms: number;
  exit_code?: number;
  artifacts?: string[];
}

export interface DeploymentTarget {
  platform: 'github' | 'vercel' | 'railway' | 'aws';
  status: 'pending' | 'deployed' | 'failed' | 'skipped';
  url?: string;
  error?: string;
}

export interface DeploymentInfo {
  commit_sha?: string;
  url?: string;
  branch: string;
  status: 'deployed' | 'skipped' | 'failed' | 'pending';
  deployed_at?: string;
  error?: string;
  targets?: DeploymentTarget[];
}

export interface CostMetrics {
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  estimated_cost_usd: number;
}

export interface AutoFixIteration {
  iteration: number;
  previous_score: number;
  new_score: number;
  changes: string[];
}

export interface Summary {
  status: string;
  next_steps: string[];
  files_generated: number;
  issues_found: number;
  execution_time_ms: number;
  cost_metrics?: CostMetrics;
  auto_fix_iterations?: AutoFixIteration[];
  swarm_agents?: string[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  stack: string;
  docker_image: string;
  default_env: ExecutionEnvironment;
  default_config: Partial<Config>;
  sample_files: SourceFile[];
}

export interface ScheduledRunConfig {
  enabled: boolean;
  cron_expression: string;
  timezone?: string;
}

export interface AgentRun {
  id: string;
  inputs: CodingTask;
  generated_code: SourceFile[];
  review_report: ReviewReport;
  execution_results: ExecutionResults;
  summary: Summary;
  deployment_info: DeploymentInfo;
  created_at: string;
  updated_at?: string;
  parent_run_id?: string;
  iteration?: number;
}

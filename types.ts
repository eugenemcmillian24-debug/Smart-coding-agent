export interface Config {
  coding_style?: string;          // e.g. "airbnb", "google", "standard", "prettier"
  security_policies?: string[];  // e.g. ["no-eval", "strict-csp", "sanitize-inputs"]
  test_preferences?: {
    framework?: string;            // e.g. "jest", "mocha", "pytest", "vitest"
    include_integration_tests?: boolean;
    coverage_threshold?: number;   // 0-100
  };
  lint_rules?: string[];         // additional lint rules
  [key: string]: any;
}

export interface ExecutionEnvironment {
  docker_image?: string;         // e.g. "node:18-alpine", "python:3.11-slim"
  resource_limits?: {
    cpu?: string;                // e.g. "1", "500m"
    memory?: string;             // e.g. "512Mi", "2Gi"
    timeout_seconds?: number;
  };
  [key: string]: any;
}

export interface CodingTask {
  task_description: string;
  target_stack: string;
  repository_url: string;
  execution_environment: ExecutionEnvironment;
  config: Config;
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
  cwe_id?: string;             // e.g. "CWE-79"
  remediation?: string;
}

export interface ReviewReport {
  quality_score: number;        // 0-100
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
  artifacts?: string[];           // output files produced
}

export interface DeploymentInfo {
  commit_sha?: string;
  url?: string;
  branch: string;
  status: 'deployed' | 'skipped' | 'failed' | 'pending';
  deployed_at?: string;
  error?: string;
}

export interface Summary {
  status: string;
  next_steps: string[];
  files_generated: number;
  issues_found: number;
  execution_time_ms: number;
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
}

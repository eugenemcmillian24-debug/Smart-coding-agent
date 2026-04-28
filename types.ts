export interface CodingTask {
  task_description: string;
  target_stack: string;
  repository_url: string;
  execution_environment: string;
  config?: Record<string, unknown>;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface ReviewReport {
  quality_score: number;
  security_issues: string[];
  suggested_improvements: string[];
  passed: boolean;
}

export interface ExecutionResults {
  success: boolean;
  logs: string;
  error_message?: string;
}

export interface DeploymentInfo {
  commit_sha?: string;
  url?: string;
}

export interface AgentRun {
  id: string;
  timestamp: number;
  task: CodingTask;
  generated_code: GeneratedFile[];
  review_report: ReviewReport;
  execution_results: ExecutionResults;
  summary: {
    status: "success" | "revision_needed" | "failed";
    message: string;
    next_steps: string;
  };
  deployment_info?: DeploymentInfo;
}

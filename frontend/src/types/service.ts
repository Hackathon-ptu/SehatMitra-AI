export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export interface ApiConfig {
  baseUrl: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

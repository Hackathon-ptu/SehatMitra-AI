import { ApiConfig, ApiResponse } from '../types/service';

/**
 * Base API service foundation.
 * Reads environment configuration without hardcoding backend URLs.
 * Prepared for future integration with SehatMitra AI backend endpoints.
 */
class ApiService {
  private config: ApiConfig;

  constructor() {
    this.config = {
      baseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
      timeoutMs: Number(import.meta.env.VITE_API_TIMEOUT) || 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };
  }

  public getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Generic fetch wrapper for future service integration
   */
  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.config.headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: err instanceof Error ? err.message : 'An unexpected error occurred.',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export const apiService = new ApiService();

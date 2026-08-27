import axios from 'axios';
import API_BASE_URL from '../config/api';

// Create Axios Instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to attach JWT token to ALL requests
apiClient.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 globally and clear auth data
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth_state_changed'));
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints

export const authApi = {
  async signup(data: any) {
    const signupData = {
      email: data.email,
      password: data.password,
      full_name: data.full_name,
      phone_number: data.phone_number || null,
      role: data.role || "patient",
    };
    const response = await apiClient.post('/auth/signup', signupData);
    return response.data;
  },

  async login(formData: Record<string, string>) {
    // Backend uses OAuth2PasswordRequestForm or JSON login
    // Ensure request is sent as application/x-www-form-urlencoded with username (mapped from email) and password
    const params = new URLSearchParams();
    params.append('username', formData.email || formData.username || '');
    params.append('password', formData.password || '');

    const response = await apiClient.post('/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.data?.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
  },
};

export const authService = {
  async sendOTP(email: string, phone: string) {
    const response = await apiClient.post('/auth/send-otp', { email, phone });
    return response.data;
  },

  async firebaseLogin(data: any) {
    const response = await apiClient.post('/auth/firebase-login', {
      email: data.email,
      full_name: data.full_name,
      username: data.username,
      phone: data.phone,
    });
    if (response.data?.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('access_token', response.data.access_token);
    }
    return response.data;
  },

  async verifyAndRegister(data: any) {
    const response = await apiClient.post('/auth/verify-and-register', {
      email: data.email,
      otp_code: data.otp_code,
      password: data.password,
      full_name: data.full_name,
      phone: data.phone,
      username: data.username,
    });
    if (response.data?.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('access_token', response.data.access_token);
    }
    return response.data;
  },

  async signup(data: any) {
    return authApi.signup(data);
  },

  async login(data: any) {
    const params = new URLSearchParams();
    params.append('username', data.identifier || data.email || data.username || '');
    params.append('password', data.password || '');

    const response = await apiClient.post('/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.data?.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('access_token', response.data.access_token);
    }
    return response.data;
  },

  async getMe() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  async updateProfile(profileData: any) {
    const response = await apiClient.post('/auth/profile', profileData);
    return response.data;
  },

  async suggestUsernames(baseName: string, email: string) {
    const response = await apiClient.get('/auth/suggest-usernames', {
      params: { base_name: baseName, email }
    });
    return response.data;
  },

  async forgotPassword(identifier: string) {
    const response = await apiClient.post('/auth/forgot-password', { identifier });
    return response.data;
  },

  async resetPassword(email: string, otp_code: string, new_password: string) {
    const response = await apiClient.post('/auth/reset-password', { email, otp_code, new_password });
    return response.data;
  },

  async verifyPassword(password: string) {
    const response = await apiClient.post('/auth/verify-password', { password });
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
  },
};

export const healthService = {
  async sendInterviewMessage(data: any) {
    const response = await apiClient.post('/health-interview/', data);
    return response.data;
  },
  async assessRisk(riskPayload: any) {
    const response = await apiClient.post('/risk/', riskPayload);
    return response.data;
  },
  async getTriageChatResponse(payload: any) {
    const response = await apiClient.post('/triage/', payload);
    return response.data;
  },
  async getDualAiTriage(payload: any) {
    const response = await apiClient.post('/triage/chat', payload);
    return response.data;
  },
};

// Chat API endpoints
export const chatApi = {
  async sendMessage(message: string, language: string = 'en', sessionId?: number) {
    const response = await apiClient.post('/chat/', {
      message,
      language,
      session_id: sessionId || null,
    });
    return response.data;
  },
};

// Health Interview API endpoints
export const interviewApi = {
  async sendAnswer(userMessage: string, language: string = 'en', sessionId?: number) {
    const response = await apiClient.post('/health-interview/', {
      user_message: userMessage,
      language,
      session_id: sessionId || null,
    });
    return response.data;
  },
};

// Risk Assessment API endpoints
export const riskApi = {
  async assessRisk(sessionId: number, symptomsData: Record<string, any>) {
    const response = await apiClient.post('/risk/', {
      session_id: sessionId,
      symptoms_data: symptomsData,
    });
    return response.data;
  },
};

// Nearby Hospital API endpoints
export const hospitalApi = {
  async getNearby(lat: number, lon: number, risk: string = 'moderate') {
    const response = await apiClient.get('/hospital/', {
      params: {
        lat,
        lon,
        risk,
      },
    });
    return response.data;
  },
};

export const reportApi = {
  async uploadReport(file: File, language?: string) {
    const activeLang = language || localStorage.getItem('preferred_lang') || localStorage.getItem('language') || 'hi-IN';
    const langCode = activeLang.split('-')[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', langCode);

    const response = await apiClient.post(`/reports/analyze`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Nearby Hospital service (used by HospitalLocator.jsx)
export const hospitalService = {
  async getNearbyHospitals(lat: number, lon: number, risk?: string) {
    const response = await apiClient.get('/hospital/', {
      params: {
        lat,
        lon,
        risk: risk || 'moderate',
      },
    });
    return response.data;
  },
};

// Medical report upload service (used by ReportAnalyzer.jsx)
export const reportService = {
  async uploadReport(file: File, language?: string) {
    const activeLang =
      language ||
      localStorage.getItem('preferred_lang') ||
      localStorage.getItem('language') ||
      'hi-IN';
    const langCode = activeLang.split('-')[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', langCode);

    const response = await apiClient.post('/reports/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};



// Consultation & report history service (used by HistoryDashboard.jsx)

// Type definitions for history service
export interface ConsultationRecord {
  // Define fields as needed; using index signature for flexibility
  [key: string]: any;
}

export interface SaveConsultationPayload {
  // Define fields as needed; using index signature for flexibility
  [key: string]: any;
}

export const historyService = {
  async getConsultations(userEmail?: string): Promise<ConsultationRecord[]> {
    const url = userEmail ? `/history/consultations?user_email=${encodeURIComponent(userEmail)}` : '/history/consultations';
    const response = await apiClient.get(url);
    return response.data;
  },

  async getReports(): Promise<any[]> {
    const response = await apiClient.get('/history/reports');
    return response.data;
  },

  async saveConsultation(data: SaveConsultationPayload): Promise<any> {
    const response = await apiClient.post('/history/consultations/save', data);
    return response.data;
  },
};

// Bhashini speech service (used by HealthChat.jsx)
export const bhashiniService = {
  async transcribeAudio(audioBase64: string, languageCode: string) {
    const response = await apiClient.post('/bhashini/asr', {
      audio_base64: audioBase64,
      language_code: languageCode,
    });
    return response.data;
  },
  async synthesizeSpeech(text: string, languageCode: string, gender: string = 'female') {
    const response = await apiClient.post('/bhashini/tts', {
      text,
      language_code: languageCode,
      gender,
    });
    return response.data;
  },
};

// Microsoft Edge Neural TTS service
export const neuralTtsService = {
  async synthesizeSpeech(text: string, languageCode: string) {
    const response = await apiClient.post('/tts/speak', {
      text,
      language_code: languageCode,
    }, {
      timeout: 8000,
    });
    return response.data;
  }
};

// ASHA Worker & Community Health Portal Service
export const ashaService = {
  async getCommunityStats() {
    const response = await apiClient.get('/analytics/community-stats');
    return response.data;
  },
  async submitFieldScreening(payload: any) {
    const response = await apiClient.post('/analytics/field-screening', payload);
    return response.data;
  },
  async getMchRecords() {
    const response = await apiClient.get('/analytics/mch-records');
    return response.data;
  },
  async addMchRecord(payload: any) {
    const response = await apiClient.post('/analytics/mch-records', payload);
    return response.data;
  },
  async getSupplies() {
    const response = await apiClient.get('/analytics/supplies');
    return response.data;
  },
  async requestRestock(payload: any) {
    const response = await apiClient.post('/analytics/supplies/request', payload);
    return response.data;
  },
  async reportOutbreak(payload: any) {
    const response = await apiClient.post('/analytics/report-outbreak', payload);
    return response.data;
  }
};

export default apiClient;


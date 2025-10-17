import type {
  GameState,
  JoinGameRequest,
  PlaceBetRequest,
  PostMessageRequest,
  SendDMRequest,
  DirectMessage
} from '../types/game';

const API_BASE = '/api/v1';

class APIService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Game endpoints
  async getGameState(): Promise<GameState> {
    return this.request<GameState>('/game');
  }

  async joinGame(data: JoinGameRequest): Promise<{ success: boolean; message: string }> {
    return this.request('/join', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async placeBet(data: PlaceBetRequest): Promise<{ success: boolean; message: string }> {
    return this.request('/bet', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async postMessage(data: PostMessageRequest): Promise<{ success: boolean; postId: string }> {
    return this.request('/post', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendDM(data: SendDMRequest): Promise<{ success: boolean }> {
    return this.request('/dm', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDMs(agentId: string): Promise<DirectMessage[]> {
    return this.request(`/dms/${agentId}`);
  }

  async getMarket(): Promise<{ yesOdds: number; noOdds: number; volume: number }> {
    return this.request('/market');
  }

  async healthCheck(): Promise<{ status: string }> {
    return this.request('/health');
  }
}

export const api = new APIService();


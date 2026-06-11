const SANDBOX_URL = import.meta.env.VITE_API_URL || "http://localhost:9090";
const ENGINE_URL = "http://localhost:8081";

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

async function request(url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = errorText || `HTTP error! status: ${response.status}`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error) errorMsg = parsed.error;
      } catch (e) {}
      throw new Error(errorMsg);
    }
    return response;
  } catch (error: any) {
    if (error instanceof TypeError) {
      throw new NetworkError("Backend offline");
    }
    throw error;
  }
}

export const api = {
  // Sandbox Runner
  submitCode: async (file: File, team: string, language: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("team", team);
    formData.append("language", language);

    const response = await request(`${SANDBOX_URL}/submit`, {
      method: "POST",
      body: formData,
    });
    return response.json();
  },

  getStatus: async (id: string) => {
    const response = await request(`${SANDBOX_URL}/status/${id}`);
    return response.json();
  },

  getSubmissions: async () => {
    const response = await request(`${SANDBOX_URL}/submissions`);
    return response.json();
  },

  deleteSubmission: async (id: string) => {
    const response = await request(`${SANDBOX_URL}/submission/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },

  // Matching Engine  
  engineHealth: async () => {
    const response = await request(`${ENGINE_URL}/health`);
    return response.json();
  },

  getOrderBook: async () => {
    const response = await request(`${ENGINE_URL}/orderbook`);
    return response.json();
  },
};

export const API_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, '')

if (!API_URL) {
  throw new Error('VITE_API_URL is not set; copy web/.env.example to web/.env')
}

export const WS_URL = `${API_URL.replace(/^http/, 'ws')}/ws`

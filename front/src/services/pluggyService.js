import api from './api'

export const pluggyService = {
  getConnectToken: () => api.get('/pluggy/connect-token').then(r => r.data),
  registerItem: (itemId) => api.post(`/pluggy/items/${itemId}`).then(r => r.data),
  listConnections: () => api.get('/pluggy/connections').then(r => r.data),
  sync: (id) => api.post(`/pluggy/connections/${id}/sync`),
  disconnect: (id) => api.delete(`/pluggy/connections/${id}`),
}

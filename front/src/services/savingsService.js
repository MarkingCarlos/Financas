import api from './api'

export const savingsService = {
  list: () => api.get('/savings').then(r => r.data),
  create: (data) => api.post('/savings', data).then(r => r.data),
  update: (id, data) => api.put(`/savings/${id}`, data).then(r => r.data),
  toggleAvailable: (id) => api.patch(`/savings/${id}/available`).then(r => r.data),
  deposit: (id, amount) => api.post(`/savings/${id}/deposit?amount=${amount}`).then(r => r.data),
  transfer: (id, data) => api.post(`/savings/${id}/transfer`, data).then(r => r.data),
  remove: (id) => api.delete(`/savings/${id}`),
}

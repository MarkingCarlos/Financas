import api from './api'

export const creditCardService = {
  list: () => api.get('/credit-cards').then(r => r.data),
  getById: (id) => api.get(`/credit-cards/${id}`).then(r => r.data),
  create: (data) => api.post('/credit-cards', data).then(r => r.data),
  update: (id, data) => api.put(`/credit-cards/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/credit-cards/${id}`),
  payBill: (id, data) => api.post(`/credit-cards/${id}/pay`, data).then(r => r.data),
}

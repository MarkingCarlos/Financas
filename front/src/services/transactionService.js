import api from './api'

export const transactionService = {
  list: (params = {}) => api.get('/transactions', { params }).then(r => r.data),
  getById: (id) => api.get(`/transactions/${id}`).then(r => r.data),
  create: (data) => api.post('/transactions', data).then(r => r.data),
  update: (id, data) => api.put(`/transactions/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/transactions/${id}`),
  dashboard: () => api.get('/transactions/dashboard').then(r => r.data),
  upcoming: () => api.get('/transactions/upcoming').then(r => r.data),
  listGroup: (groupId) => api.get(`/transactions/group/${groupId}`).then(r => r.data),
  cancelGroup: (groupId) => api.delete(`/transactions/group/${groupId}`),
  spendingCapacity: () => api.get('/transactions/spending-capacity').then(r => r.data),
  receiveIncome: (id, accountId) => api.patch(`/transactions/${id}/receive`, { accountId }).then(r => r.data),
}

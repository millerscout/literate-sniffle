import { createRouter, createWebHistory } from 'vue-router'
import UploadView from './views/UploadView.vue'
import BalanceView from './views/BalanceView.vue'

const routes = [
  {
    path: '/',
    name: 'upload',
    component: UploadView
  },
  {
    path: '/balance',
    name: 'balance',
    component: BalanceView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
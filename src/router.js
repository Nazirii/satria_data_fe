import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'

// Hash history: aman untuk hosting statis (tanpa rewrite server) dan untuk disajikan FastAPI.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'beranda', component: HomeView },
    { path: '/live', name: 'live', component: () => import('./views/LiveView.vue') },
    { path: '/foto', name: 'foto', component: () => import('./views/PhotoView.vue') },
    { path: '/klaster', name: 'klaster', component: () => import('./views/ClustersView.vue') },
    { path: '/klaster/:id', name: 'klaster-detail', component: () => import('./views/ClusterDetailView.vue'), props: true },
    { path: '/antrean', redirect: '/klaster?f=tinjau' },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

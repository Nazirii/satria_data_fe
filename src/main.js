import { createApp } from 'vue'
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/geist-sans/700.css'
import '@fontsource/geist-mono/500.css'
import '@fontsource/geist-mono/600.css'
import './styles/tokens.css'
import './styles/base.css'
import App from './App.vue'
import { router } from './router.js'
import { connectBackend } from './services/api.js'

connectBackend()

createApp(App).use(router).mount('#app')

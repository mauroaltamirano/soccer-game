import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router/index.ts'
import { i18n } from './i18n/index.ts'
import {
  createDefaultServices,
  scoreServiceInjectionKey,
  progressionServiceInjectionKey,
  settingsServiceInjectionKey,
} from './services/index.ts'
import '@soccer-game/ui/styles'
import './styles/main.css'

const { scoreService, progressionService, settingsService } = createDefaultServices()

const application = createApp(App)

application.use(createPinia())
application.use(router)
application.use(i18n)

application.provide(scoreServiceInjectionKey, scoreService)
application.provide(progressionServiceInjectionKey, progressionService)
application.provide(settingsServiceInjectionKey, settingsService)

application.mount('#app')

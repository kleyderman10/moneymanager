<template>
  <div>
    <div v-if="error" class="text-error mb-4 text-body-2">
      <v-icon color="error" size="small" class="mr-1">mdi-alert-circle</v-icon>
      {{ error }}
    </div>

    <v-btn
      color="primary"
      variant="tonal"
      block
      class="rounded-lg text-none mb-4"
      :loading="isLoading"
      @click="startBelvoFlow"
      prepend-icon="mdi-bank-transfer"
    >
      {{ buttonText || 'Vincular con el Banco (Belvo)' }}
    </v-btn>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api/client.js'

const props = defineProps({
  buttonText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['success'])

const isLoading = ref(false)
const error = ref('')
const belvoScriptId = 'belvo-widget-script'

// Cargar el script de Belvo dinámicamente
onMounted(() => {
  if (!document.getElementById('belvo')) {
    const belvoDiv = document.createElement('div')
    belvoDiv.id = 'belvo'
    // Forzamos que se sobreponga al v-dialog de Vuetify
    belvoDiv.style.position = 'fixed'
    belvoDiv.style.zIndex = '9999999' 
    document.body.appendChild(belvoDiv)
  }

  if (!document.getElementById(belvoScriptId)) {
    const script = document.createElement('script')
    script.id = belvoScriptId
    script.src = 'https://cdn.belvo.io/belvo-widget-1-stable.js'
    script.async = true
    document.body.appendChild(script)
  }
})

const startBelvoFlow = async () => {
  if (typeof window.belvoSDK === 'undefined') {
    error.value = 'El widget de Belvo aún no ha cargado. Por favor espera un momento.'
    return
  }

  try {
    isLoading.value = true
    error.value = ''

    // 1. Obtener el token del widget desde nuestro backend
    const { data } = await api.post('/belvo/widget-token')
    const widgetToken = data.token

    if (!widgetToken) {
      throw new Error('No se recibió el token del widget')
    }

    // 2. Inicializar el widget de Belvo
    window.belvoSDK.createWidget(widgetToken, {
      locale: 'es',
      country_codes: ['CO'],
      callback: (link, institution) => {
        console.log('Belvo Success. Link:', link, 'Institución:', institution)
        emit('success', { linkId: link, institution })
        isLoading.value = false
      },
      onExit: (data) => {
        console.log('El usuario cerró el widget de Belvo:', data)
        isLoading.value = false
      },
      onEvent: (data) => {
        console.log('Evento de Belvo:', data)
      }
    }).build()
    
  } catch (err) {
    console.error('Error al iniciar flujo de Belvo:', err)
    error.value = 'No se pudo iniciar la conexión con el banco. Intenta nuevamente.'
    isLoading.value = false
  }
}
</script>

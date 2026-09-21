<template>
  <v-dialog :model-value="visible" persistent max-width="520">
    <v-card title="Uso de inteligencia artificial">
      <v-card-text>
        <p class="text-body-2 mb-3">
          Knexura Finanzas usa funciones de inteligencia artificial para ayudarte a registrar y
          entender tus finanzas (escanear recibos, leer extractos bancarios en PDF, sugerir
          categorías, generar presupuestos, responder tu chat y calcular recomendaciones).
        </p>
        <p class="text-body-2 mb-3">
          Para eso, cuando usas estas funciones se envían a nuestro proveedor de IA
          (<strong>OpenAI y/o Google Gemini</strong>, según la configuración vigente):
        </p>
        <v-list density="compact" class="pa-0 mb-3">
          <v-list-item prepend-icon="mdi-receipt-text-outline" title="Imágenes de recibos y facturas que escaneas" />
          <v-list-item prepend-icon="mdi-file-pdf-box" title="El contenido de los extractos bancarios en PDF que subes" />
          <v-list-item prepend-icon="mdi-chat-outline" title="Los mensajes que escribes o dictas en el chat" />
          <v-list-item prepend-icon="mdi-finance" title="Un resumen de tus movimientos, presupuestos y metas" />
        </v-list>
        <p class="text-body-2 mb-0">
          Puedes leer el detalle completo en nuestra
          <a href="#" @click.prevent="openPrivacyPolicy">política de privacidad</a>.
          Si no aceptas, puedes seguir usando la app, pero las funciones de IA quedarán deshabilitadas
          hasta que las actives desde tu perfil. Si ya aceptaste, puedes revocar el permiso
          en cualquier momento desde aquí.
        </p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          v-if="authStore.hasAcceptedAIConsent"
          color="error"
          variant="text"
          :loading="loading"
          @click="revoke"
        >
          Revocar consentimiento
        </v-btn>
        <v-btn v-else variant="text" :loading="loading" @click="decline">No usar IA por ahora</v-btn>
        <v-btn
          v-if="!authStore.hasAcceptedAIConsent"
          color="primary"
          :loading="loading"
          @click="accept"
        >
          Aceptar y continuar
        </v-btn>
        <v-btn v-else variant="text" :loading="loading" @click="decline">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSnackbar } from '@/stores/snackbar'
import { openLegalLink, PRIVACY_POLICY_URL } from '@/utils/legalLinks'

defineProps({
  visible: { type: Boolean, default: false },
})
const emit = defineEmits(['decline', 'accept'])

const authStore = useAuthStore()
const snackbar = useSnackbar()
const loading = ref(false)

const accept = async () => {
  loading.value = true
  const result = await authStore.acceptAIConsent()
  loading.value = false
  if (!result.success) return snackbar.error(result.message)
  emit('accept')
}

const revoke = async () => {
  loading.value = true
  const result = await authStore.revokeAIConsent()
  loading.value = false
  if (!result.success) return snackbar.error(result.message)
  snackbar.success('Consentimiento revocado. Las funciones de IA quedaron deshabilitadas y se borró tu historial de chat.')
  emit('decline')
}

const openPrivacyPolicy = () => openLegalLink(PRIVACY_POLICY_URL)

const decline = () => emit('decline')
</script>

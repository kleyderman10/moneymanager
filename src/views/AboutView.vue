<template>
  <div>
    <div class="page-intro">
      <div class="page-intro__eyebrow">Producto</div>
      <h1 :class="isMobile ? 'text-h5' : 'text-h4'">Acerca de Money Manager</h1>
      <p class="page-intro__subtitle">Una forma más clara e inteligente de construir bienestar financiero.</p>
    </div>

    <v-card class="mb-4">
      <v-card-title class="text-h5 font-weight-bold">Money Manager</v-card-title>
      <v-card-subtitle class="text-body-1 font-italic">Por K-Nexura: Tu nexo inteligente con la tecnología</v-card-subtitle>
      <v-card-text>
        <p class="text-body-1">
          Money Manager es un gestor financiero personal desarrollado por <strong>K-Nexura</strong>, diseñado para
          ayudarte a tomar el control de tus finanzas de forma inteligente y sencilla. Conecta todas tus cuentas,
          registra tus movimientos y deja que la inteligencia artificial te guíe hacia una mejor salud financiera.
        </p>
      </v-card-text>
    </v-card>

    <v-row>
      <v-col cols="12" sm="6" md="4">
        <v-card class="h-100">
          <v-card-title>
            <v-icon color="primary" class="mr-2">mdi-cash-multiple</v-icon>
            Transacciones
          </v-card-title>
          <v-card-text>
            Registra ingresos y gastos de forma rápida. Organiza tus movimientos con categorías personalizables
            y mantén un historial detallado de todas tus operaciones.
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card class="h-100">
          <v-card-title>
            <v-icon color="primary" class="mr-2">mdi-chart-pie</v-icon>
            Presupuestos
          </v-card-title>
          <v-card-text>
            Define presupuestos por categoría y recibe alertas cuando estés cerca de superarlos.
            Controla tus gastos y cumple tus objetivos financieros.
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card class="h-100">
          <v-card-title>
            <v-icon color="primary" class="mr-2">mdi-target</v-icon>
            Metas financieras
          </v-card-title>
          <v-card-text>
            Establece metas de ahorro y sigue tu progreso visualmente. Logra tus objetivos: un viaje,
            un fondo de emergencia, o lo que te propongas.
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card class="h-100">
          <v-card-title>
            <v-icon color="primary" class="mr-2">mdi-wallet</v-icon>
            Billeteras
          </v-card-title>
          <v-card-text>
            Administra múltiples cuentas y billeteras en un solo lugar. Visualiza tus saldos consolidados
            y el flujo de dinero entre tus cuentas.
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card class="h-100">
          <v-card-title>
            <v-icon color="primary" class="mr-2">mdi-sync</v-icon>
            Transacciones recurrentes
          </v-card-title>
          <v-card-text>
            Automatiza el registro de pagos e ingresos periódicos. Nunca olvides una factura recurrente
            y mantén tus finanzas al día sin esfuerzo.
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card class="h-100">
          <v-card-title>
            <v-icon color="primary" class="mr-2">mdi-file-chart</v-icon>
            Reportes
          </v-card-title>
          <v-card-text>
            Genera reportes detallados de tus finanzas por período. Analiza tendencias, compara meses
            y toma decisiones informadas basadas en datos reales.
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="mt-4" color="primary" theme="dark">
      <v-card-title class="text-h5">
        <v-icon class="mr-2">mdi-robot</v-icon>
        Potenciado con Inteligencia Artificial
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6">
            <p class="mb-2"><strong>Chat con IA:</strong> Consulta tus finanzas en lenguaje natural y recibe respuestas instantáneas.</p>
            <p class="mb-2"><strong>Insights inteligentes:</strong> Descubre patrones de gasto y recibe recomendaciones personalizadas.</p>
            <p class="mb-2"><strong>Health Score:</strong> Obtén una puntuación de tu salud financiera con sugerencias para mejorarla.</p>
          </v-col>
          <v-col cols="12" sm="6">
            <p class="mb-2"><strong>Sugerencia de categorías:</strong> La IA clasifica automáticamente tus transacciones.</p>
            <p class="mb-2"><strong>Recomendación de presupuestos:</strong> Recibe presupuestos inteligentes basados en tu historial.</p>
            <p class="mb-2"><strong>Escaneo de recibos:</strong> Captura tickets y facturas; la IA extrae los datos por ti.</p>
            <p class="mb-2"><strong>Entrada por voz:</strong> Registra transacciones hablando de forma natural.</p>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useDisplay } from 'vuetify'

const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
</script>

<template>
  <div class="simulators-page">
    <div class="page-intro">
      <div class="page-intro__eyebrow">Decisiones financieras</div>
      <h1 :class="isMobile ? 'text-h5' : 'text-h4'">Simuladores</h1>
      <p class="page-intro__subtitle">Compara el costo de un crédito o proyecta cuánto pueden crecer tus ahorros.</p>
    </div>

    <v-tabs v-model="tab" color="primary" class="mb-4">
      <v-tab value="loan" prepend-icon="mdi-cash-multiple">Crédito</v-tab>
      <v-tab value="cdt" prepend-icon="mdi-bank-outline">CDT</v-tab>
      <v-tab value="savings" prepend-icon="mdi-piggy-bank-outline">Ahorro</v-tab>
      <v-tab value="capacity" prepend-icon="mdi-finance">Capacidad crediticia</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="capacity">
        <v-row>
          <v-col cols="12" lg="4">
            <v-card title="Tu capacidad de endeudamiento" subtitle="Basada en tus últimos movimientos registrados">
              <v-card-text>
                <v-form @submit.prevent="loadCreditCapacity">
                  <v-text-field
                    v-model.number="capacityForm.existingMonthlyDebt"
                    label="Cuotas mensuales actuales"
                    type="number"
                    min="0"
                    :prefix="currencySymbol"
                    prepend-inner-icon="mdi-credit-card-clock-outline"
                    hint="Incluye préstamos, libranzas y pagos mínimos que ya debes cubrir cada mes."
                    persistent-hint
                  />
                  <v-btn type="submit" color="primary" size="large" block class="mt-4" :loading="capacityLoading">
                    Evaluar mi capacidad
                  </v-btn>
                </v-form>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" lg="8">
            <template v-if="capacityResult">
              <v-alert
                :type="alertFor(capacityResult.capacity.status).type"
                :color="alertFor(capacityResult.capacity.status).color"
                :icon="alertFor(capacityResult.capacity.status).icon"
                variant="tonal"
                class="mb-4"
              >
                <div class="font-weight-bold mb-1">{{ capacityResult.capacity.title }}</div>
                <div>{{ capacityResult.capacity.message }}</div>
                <v-btn
                  class="mt-3"
                  size="small"
                  variant="outlined"
                  color="primary"
                  prepend-icon="mdi-cash-multiple"
                  @click="openLoanEvaluation"
                >
                  Evaluar un crédito
                </v-btn>
              </v-alert>

              <v-card class="mb-4" title="Resumen de tu flujo mensual">
                <v-card-text>
                  <div v-if="capacityResult.capacity.monthsAnalyzed" class="text-caption text-medium-emphasis mb-3">
                    Promedio de {{ capacityResult.capacity.monthsAnalyzed }} {{ capacityResult.capacity.monthsAnalyzed === 1 ? 'mes' : 'meses' }} · {{ capacityResult.capacity.transactionCount }} movimientos analizados
                  </div>
                  <v-alert
                    v-if="capacityResult.capacity.includesCurrentPartialMonth"
                    type="warning"
                    density="compact"
                    variant="tonal"
                    class="mb-3"
                  >
                    La estimación usa el mes actual porque aún no hay movimientos en meses completos.
                  </v-alert>
                  <v-alert
                    v-else-if="capacityResult.capacity.monthsWithData < capacityResult.capacity.monthsAnalyzed"
                    type="warning"
                    density="compact"
                    variant="tonal"
                    class="mb-3"
                  >
                    Solo hay movimientos en {{ capacityResult.capacity.monthsWithData }} de los {{ capacityResult.capacity.monthsAnalyzed }} meses analizados; interpreta el resultado con cautela.
                  </v-alert>
                  <div v-if="capacityResult.capacity.currentDebtToIncome !== null">
                    <div class="readiness-gauge">
                      <CircularGauge
                        :value="capacityResult.capacity.readinessScore"
                        size="108"
                        width="10"
                        value-class="readiness-gauge__value"
                      />
                      <div class="readiness-gauge__text">
                        <div class="readiness-gauge__label">Indicador del flujo</div>
                        <div class="readiness-gauge__title">{{ capacityResult.capacity.title }}</div>
                      </div>
                    </div>
                    <div class="capacity-grid">
                      <div><span>Ingreso promedio</span><strong>{{ money(capacityResult.capacity.averageIncome) }}</strong></div>
                      <div><span>Gasto promedio</span><strong>{{ money(capacityResult.capacity.averageExpenses) }}</strong></div>
                      <div><span>Excedente mensual</span><strong :class="capacityResult.capacity.averageSurplus >= 0 ? 'text-success' : 'text-error'">{{ money(capacityResult.capacity.averageSurplus) }}</strong></div>
                      <div><span>Cuotas actuales / ingreso</span><strong>{{ percent(capacityResult.capacity.currentDebtToIncome) }}</strong></div>
                      <div><span>Límite por ingreso (30%)</span><strong>{{ money(capacityResult.capacity.maximumByDebtRatio) }}</strong></div>
                      <div><span>Límite por excedente (70%)</span><strong>{{ money(capacityResult.capacity.maximumByCashFlow) }}</strong></div>
                      <div><span>Nueva cuota máxima sugerida</span><strong>{{ money(capacityResult.capacity.recommendedMaxPayment) }}</strong></div>
                    </div>
                  </div>
                  <div v-else class="text-body-2 text-medium-emphasis">
                    Registra movimientos de ingresos y gastos para obtener una evaluación personalizada.
                  </div>
                  <div class="text-caption text-medium-emphasis mt-3">La cuota máxima sugerida usa el menor valor entre el 30% de tu ingreso, descontando cuotas actuales, y el 70% de tu excedente mensual.</div>
                  <div class="text-caption text-medium-emphasis mt-2">{{ capacityResult.capacity.disclaimer }}</div>
                </v-card-text>
              </v-card>
            </template>

            <v-card class="mb-4" title="Viabilidad para tarjeta de crédito" subtitle="Esta evaluación es independiente de la capacidad y tiene su propio botón">
              <v-card-text>
                <v-form @submit.prevent="loadCardViability">
                  <v-row dense>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model.number="cardForm.existingMonthlyDebt"
                        label="Cuotas mensuales actuales"
                        type="number"
                        min="0"
                        :prefix="currencySymbol"
                        prepend-inner-icon="mdi-credit-card-clock-outline"
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model.number="cardForm.requestedCardLimit"
                        label="Cupo de tarjeta a evaluar"
                        type="number"
                        min="0"
                        :prefix="currencySymbol"
                        prepend-inner-icon="mdi-credit-card-outline"
                        hint="Déjalo en 0 para ver un cupo orientativo."
                        persistent-hint
                      />
                    </v-col>
                  </v-row>
                  <v-btn type="submit" color="primary" variant="outlined" :loading="cardLoading">
                    Evaluar tarjeta
                  </v-btn>
                </v-form>

                <template v-if="cardResult">
                  <v-alert
                    :type="alertFor(cardResult.creditCard.status).type"
                    :color="alertFor(cardResult.creditCard.status).color"
                    :icon="alertFor(cardResult.creditCard.status).icon"
                    variant="tonal"
                    density="comfortable"
                    class="mt-4 mb-4"
                  >
                    <div class="font-weight-bold mb-1">{{ cardResult.creditCard.title }}</div>
                    <div>{{ cardResult.creditCard.message }}</div>
                  </v-alert>
                  <div v-if="cardResult.creditCard.suggestedCardLimit !== null" class="capacity-grid">
                    <div><span>Cupo orientativo máximo</span><strong>{{ money(cardResult.creditCard.suggestedCardLimit) }}</strong></div>
                    <div><span>Uso mensual recomendado</span><strong>{{ money(cardResult.creditCard.recommendedMonthlyCardSpend) }}</strong></div>
                    <div v-if="cardResult.creditCard.requestedCardLimit"><span>Pago mínimo estimado del cupo evaluado</span><strong>{{ money(cardResult.creditCard.estimatedMinimumPayment) }}</strong></div>
                  </div>
                  <p class="text-caption text-medium-emphasis mt-3 mb-0">{{ cardResult.creditCard.disclaimer }}</p>
                </template>
                <div v-else class="text-body-2 text-medium-emphasis mt-4">
                  Ingresa el cupo que estás considerando y presiona “Evaluar tarjeta”. No depende del botón de capacidad.
                </div>
              </v-card-text>
            </v-card>

            <v-card v-if="!capacityResult" class="simulation-empty"><v-card-text><v-icon size="48">mdi-finance</v-icon><h3>Conoce tu margen antes de endeudarte</h3><p>Analizaremos tus ingresos, gastos y cuotas actuales para orientar una solicitud de crédito o tarjeta.</p></v-card-text></v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <v-window-item value="loan">
        <v-row>
          <v-col cols="12" lg="4">
            <v-card title="Datos del crédito" subtitle="Sistema de cuota fija mensual">
              <v-card-text>
                <v-form @submit.prevent="simulateLoan">
                  <v-text-field
                    v-model.number="loanForm.amount"
                    label="Monto solicitado"
                    type="number"
                    min="1"
                    :prefix="currencySymbol"
                    prepend-inner-icon="mdi-cash"
                    required
                  />
                  <v-text-field
                    v-model.number="loanForm.interestRate"
                    label="Tasa de interés"
                    type="number"
                    min="0"
                    max="200"
                    step="0.01"
                    suffix="%"
                    prepend-inner-icon="mdi-percent-outline"
                    required
                  />
                  <v-select
                    v-model="loanForm.ratePeriod"
                    :items="rateTypes"
                    label="Tipo de tasa"
                    prepend-inner-icon="mdi-calendar-sync-outline"
                  />
                  <v-text-field
                    v-model.number="loanForm.termMonths"
                    label="Plazo"
                    type="number"
                    min="1"
                    max="360"
                    suffix="meses"
                    prepend-inner-icon="mdi-calendar-range"
                    required
                  />
                  <v-text-field
                    v-model.number="loanForm.requestedMonthlyPayment"
                    label="Cuota mensual a evaluar (opcional)"
                    type="number"
                    min="1"
                    :prefix="currencySymbol"
                    prepend-inner-icon="mdi-cash-check"
                    hint="Si la dejas vacía, se valida la cuota calculada por monto, tasa y plazo."
                    persistent-hint
                  />
                  <v-text-field
                    v-model.number="loanForm.existingMonthlyDebt"
                    label="Otras cuotas mensuales"
                    type="number"
                    min="0"
                    :prefix="currencySymbol"
                    prepend-inner-icon="mdi-credit-card-clock-outline"
                    hint="Incluye créditos vigentes; se usa para medir tu endeudamiento."
                    persistent-hint
                  />
                  <v-text-field
                    v-model.number="loanForm.monthlyExpenseReduction"
                    label="Reducción mensual de gastos (opcional)"
                    type="number"
                    min="0"
                    :prefix="currencySymbol"
                    prepend-inner-icon="mdi-trending-down"
                    hint="Simula cuánto podrías recortar cada mes para saber cuándo encaja la cuota."
                    persistent-hint
                  />
                  <v-btn type="submit" color="primary" size="large" block class="mt-4" :loading="loading">
                    Validar crédito y cuota
                  </v-btn>
                </v-form>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" lg="8">
            <template v-if="loanResult">
              <div class="loan-result-summary">
                {{ money(loanResult.amount) }} · {{ loanForm.interestRate }}{{ loanForm.ratePeriod === 'annual_effective' ? '% E.A.' : '% mensual' }} · {{ loanResult.termMonths }} meses
              </div>

              <div class="loan-hero">
                <div class="loan-hero__label">Cuota mensual estimada</div>
                <div class="loan-hero__value">{{ money(loanResult.monthlyPayment) }}</div>
              </div>

              <div class="loan-composition">
                <div class="loan-composition__legend">
                  <span><i class="loan-composition__dot loan-composition__dot--principal" /> Capital</span>
                  <span><i class="loan-composition__dot loan-composition__dot--interest" /> Interés</span>
                </div>
                <div class="loan-composition__bar">
                  <div class="loan-composition__segment loan-composition__segment--principal" :style="{ width: principalPercent + '%' }" />
                  <div class="loan-composition__segment loan-composition__segment--interest" :style="{ width: interestPercent + '%' }" />
                </div>
                <div class="loan-composition__scale">
                  <span>{{ percentDisplay(principalPercent) }}</span>
                  <span>{{ percentDisplay(interestPercent) }}</span>
                </div>
              </div>

              <v-row dense class="mb-3">
                <v-col cols="6" md="4">
                  <div class="loan-stat"><span>Costo total del crédito</span><strong>{{ money(loanResult.totalPaid) }}</strong></div>
                </v-col>
                <v-col cols="6" md="4">
                  <div class="loan-stat"><span>Total de intereses</span><strong class="text-error">{{ money(loanResult.totalInterest) }}</strong></div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="loan-stat"><span>Tasa mensual</span><strong>{{ percent(loanResult.monthlyRate) }}</strong></div>
                </v-col>
              </v-row>

              <v-alert v-if="paymentExceedsCapacity" type="warning" color="error" variant="tonal" class="mb-4" icon="mdi-alert-octagon-outline">
                <div>
                  Esta cuota (<strong>{{ money(evaluatedPayment) }}</strong>) supera tu límite sugerido de
                  <strong>{{ money(suggestedMaxPayment) }}</strong> en {{ money(capacityExcessAmount) }} según tu flujo mensual en Capacidad crediticia.
                  Con tu excedente actual, este crédito comprometería más de lo recomendado.
                </div>
                <v-btn variant="text" size="small" color="error" class="mt-2 px-0" @click="tab = 'capacity'">Ver capacidad crediticia →</v-btn>
              </v-alert>

              <v-alert
                :type="capacityAlert.type"
                :color="capacityAlert.color"
                variant="tonal"
                class="mb-4"
                :icon="capacityAlert.icon"
              >
                <div class="font-weight-bold mb-1">{{ loanResult.capacity.title }}</div>
                <div>{{ loanResult.capacity.message }}</div>
              </v-alert>

              <v-card class="mb-4" title="Capacidad según tus movimientos">
                <v-card-text>
                  <div v-if="loanResult.capacity.monthsAnalyzed" class="text-caption text-medium-emphasis mb-3">
                    Promedio de {{ loanResult.capacity.monthsAnalyzed }} {{ loanResult.capacity.monthsAnalyzed === 1 ? 'mes' : 'meses' }} · {{ loanResult.capacity.transactionCount }} movimientos analizados
                  </div>
                  <v-alert
                    v-if="loanResult.capacity.includesCurrentPartialMonth"
                    type="warning"
                    density="compact"
                    variant="tonal"
                    class="mb-3"
                  >
                    La estimación usa el mes actual porque aún no hay movimientos en meses completos.
                  </v-alert>
                  <v-alert
                    v-else-if="loanResult.capacity.monthsWithData < loanResult.capacity.monthsAnalyzed"
                    type="warning"
                    density="compact"
                    variant="tonal"
                    class="mb-3"
                  >
                    Solo hay movimientos en {{ loanResult.capacity.monthsWithData }} de los {{ loanResult.capacity.monthsAnalyzed }} meses analizados; interpreta el resultado con cautela.
                  </v-alert>
                  <div v-if="loanResult.capacity.debtToIncome !== null" class="capacity-grid">
                    <div><span>Monto del crédito</span><strong>{{ money(loanResult.amount) }}</strong></div>
                    <div><span>Plazo</span><strong>{{ loanResult.termMonths }} meses</strong></div>
                    <div><span>Ingreso promedio</span><strong>{{ money(loanResult.capacity.averageIncome) }}</strong></div>
                    <div><span>Gasto promedio</span><strong>{{ money(loanResult.capacity.averageExpenses) }}</strong></div>
                    <div><span>Excedente después de la cuota</span><strong :class="loanResult.capacity.cashFlowAfterPayment >= 0 ? 'text-success' : 'text-error'">{{ money(loanResult.capacity.cashFlowAfterPayment) }}</strong></div>
                    <div><span>Cuotas / ingreso</span><strong>{{ percent(loanResult.capacity.debtToIncome) }}</strong></div>
                    <div><span>Cuota evaluada</span><strong>{{ money(loanResult.capacity.evaluatedMonthlyPayment) }}</strong></div>
                    <div><span>Cuota máxima sugerida</span><strong>{{ money(loanResult.capacity.recommendedMaxPayment) }}</strong></div>
                    <div><span>Crédito máximo estimado</span><strong>{{ money(loanResult.capacity.estimatedMaxLoan) }}</strong></div>
                  </div>
                  <div v-else class="text-body-2 text-medium-emphasis">
                    Registra movimientos de ingresos y gastos para obtener una evaluación personalizada.
                  </div>
                  <div class="text-caption text-medium-emphasis mt-3">{{ loanResult.capacity.disclaimer }}</div>
                </v-card-text>
              </v-card>

              <v-card v-if="loanResult.capacity.manageability" class="mb-4" title="¿Cuándo sería manejable esta cuota?" subtitle="Proyección educativa si reduces gastos de forma constante">
                <v-card-text>
                  <div class="text-body-2 mb-3">
                    La evaluación compara la cuota con dos límites: no superar el 30% de tus ingresos después de cuotas actuales y conservar al menos el 30% de tu excedente como margen.
                  </div>
                  <v-alert
                    v-if="loanResult.capacity.manageability.paymentFitsNow"
                    type="success"
                    variant="tonal"
                    density="comfortable"
                    class="mb-4"
                  >
                    Esta cuota encaja hoy en tu flujo promedio. Aun así, conserva un fondo para imprevistos.
                  </v-alert>
                  <v-alert
                    v-else-if="!loanResult.capacity.manageability.debtRatioAllowsPayment"
                    type="error"
                    variant="tonal"
                    density="comfortable"
                    class="mb-4"
                  >
                    Reducir gastos no sería suficiente: la cuota supera el 30% de tus ingresos después de las cuotas actuales. Considera pedir menos o ampliar el plazo.
                  </v-alert>
                  <v-alert
                    v-else-if="loanResult.capacity.manageability.monthsToManage !== null"
                    type="warning"
                    variant="tonal"
                    density="comfortable"
                    class="mb-4"
                  >
                    Con una reducción de {{ money(loanResult.capacity.manageability.monthlyExpenseReduction) }} al mes, la cuota podría encajar en {{ formatMonthKey(loanResult.capacity.manageability.targetMonth) }} (en aproximadamente {{ loanResult.capacity.manageability.monthsToManage }} {{ loanResult.capacity.manageability.monthsToManage === 1 ? 'mes' : 'meses' }}).
                  </v-alert>
                  <v-alert
                    v-else
                    type="info"
                    variant="tonal"
                    density="comfortable"
                    class="mb-4"
                  >
                    Para que esta cuota entre en el rango prudente necesitarías reducir aproximadamente {{ money(loanResult.capacity.manageability.requiredMonthlyExpenseReduction) }} de gastos al mes. Ingresa ese valor en el formulario para proyectar el mes estimado.
                  </v-alert>
                  <div class="capacity-grid">
                    <div><span>Cuota calculada</span><strong>{{ money(loanResult.capacity.monthlyPayment) }}</strong></div>
                    <div><span>Cuota evaluada</span><strong>{{ money(loanResult.capacity.evaluatedMonthlyPayment) }}</strong></div>
                    <div><span>Pago / ingreso</span><strong>{{ percent(loanResult.capacity.paymentToIncome) }}</strong></div>
                    <div><span>Reducción mensual simulada</span><strong>{{ money(loanResult.capacity.manageability.monthlyExpenseReduction) }}</strong></div>
                  </div>
                  <v-table density="compact" class="mt-4" aria-label="Proyección de gastos y cuota">
                    <thead><tr><th>Mes</th><th>Gasto proyectado</th><th>Cuota máxima prudente</th><th>¿Encaja?</th></tr></thead>
                    <tbody>
                      <tr v-for="month in loanResult.capacity.manageability.projection.slice(0, 6)" :key="month.month">
                        <td>{{ month.month === 0 ? 'Ahora' : formatMonthKey(month.label) }}</td>
                        <td>{{ money(month.projectedExpenses) }}</td>
                        <td>{{ money(month.recommendedMaxPayment) }}</td>
                        <td><v-icon :color="month.paymentFits ? 'success' : 'error'" size="18">{{ month.paymentFits ? 'mdi-check-circle' : 'mdi-close-circle' }}</v-icon></td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-card-text>
              </v-card>

              <v-card class="mb-4" title="Cómo disminuye la deuda">
                <v-card-text><div class="simulation-chart"><Line :data="loanChartData" :options="chartOptions" /></div></v-card-text>
              </v-card>

              <v-expansion-panels>
                <v-expansion-panel>
                  <v-expansion-panel-title>Ver tabla de amortización ({{ loanResult.termMonths }} cuotas)</v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-data-table
                      :headers="amortizationHeaders"
                      :items="loanResult.schedule"
                      :items-per-page="12"
                      density="compact"
                    >
                      <template #item.payment="{ item }">{{ money(item.payment) }}</template>
                      <template #item.principal="{ item }">{{ money(item.principal) }}</template>
                      <template #item.interest="{ item }">{{ money(item.interest) }}</template>
                      <template #item.balance="{ item }">{{ money(item.balance) }}</template>
                    </v-data-table>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </template>
            <v-card v-else class="simulation-empty"><v-card-text><v-icon size="48">mdi-calculator-variant-outline</v-icon><h3>Configura el escenario</h3><p>Calcula la cuota, el costo total y si encaja en tu flujo mensual.</p></v-card-text></v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <v-window-item value="cdt">
        <v-row>
          <v-col cols="12" lg="4">
            <v-card title="Datos del CDT" subtitle="Rendimiento con tasa efectiva anual">
              <v-card-text>
                <v-form @submit.prevent="simulateCdt">
                  <v-text-field v-model.number="cdtForm.initialAmount" label="Monto a invertir" type="number" min="1" :prefix="currencySymbol" prepend-inner-icon="mdi-cash-lock" required />
                  <v-text-field v-model.number="cdtForm.annualRate" label="Tasa efectiva anual" type="number" min="0" max="100" step="0.01" suffix="% E.A." prepend-inner-icon="mdi-percent-outline" required />
                  <v-text-field v-model.number="cdtForm.termMonths" label="Plazo" type="number" min="1" max="120" suffix="meses" prepend-inner-icon="mdi-calendar-range" required />
                  <v-btn type="submit" color="primary" size="large" block :loading="loading">Proyectar CDT</v-btn>
                </v-form>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" lg="8">
            <InvestmentProjectionResults v-if="cdtResult" :result="cdtResult" :currency="currency" />
            <v-card v-else class="simulation-empty"><v-card-text><v-icon size="48">mdi-bank-outline</v-icon><h3>Proyecta tu CDT</h3><p>Conoce el valor final y los intereses brutos al vencimiento.</p></v-card-text></v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <v-window-item value="savings">
        <v-row>
          <v-col cols="12" lg="4">
            <v-card title="Plan de ahorro" subtitle="Aportes mensuales al final de cada mes">
              <v-card-text>
                <v-form @submit.prevent="simulateSavings">
                  <v-text-field v-model.number="savingsForm.initialAmount" label="Ahorro inicial" type="number" min="0" :prefix="currencySymbol" prepend-inner-icon="mdi-safe" required />
                  <v-text-field v-model.number="savingsForm.monthlyContribution" label="Aporte mensual" type="number" min="0" :prefix="currencySymbol" prepend-inner-icon="mdi-calendar-plus" required />
                  <v-text-field v-model.number="savingsForm.annualRate" label="Tasa efectiva anual" type="number" min="0" max="100" step="0.01" suffix="% E.A." prepend-inner-icon="mdi-percent-outline" required />
                  <v-text-field v-model.number="savingsForm.termMonths" label="Plazo" type="number" min="1" max="600" suffix="meses" prepend-inner-icon="mdi-calendar-range" required />
                  <v-btn type="submit" color="primary" size="large" block :loading="loading">Proyectar ahorro</v-btn>
                </v-form>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" lg="8">
            <InvestmentProjectionResults v-if="savingsResult" :result="savingsResult" :currency="currency" />
            <v-card v-else class="simulation-empty"><v-card-text><v-icon size="48">mdi-piggy-bank-outline</v-icon><h3>Diseña tu plan de ahorro</h3><p>Separa tus aportes de los intereses que podrías ganar.</p></v-card-text></v-card>
          </v-col>
        </v-row>
      </v-window-item>
    </v-window>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useRoute } from 'vue-router'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { simulationsAPI } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useSnackbar } from '@/stores/snackbar'
import InvestmentProjectionResults from '@/components/InvestmentProjectionResults.vue'
import CircularGauge from '@/components/CircularGauge.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const authStore = useAuthStore()
const snackbar = useSnackbar()
const route = useRoute()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)
const tab = ref('loan')
const loading = ref(false)
const capacityLoading = ref(false)
const cardLoading = ref(false)
const capacityResult = ref(null)
const cardResult = ref(null)
const loanResult = ref(null)
const cdtResult = ref(null)
const savingsResult = ref(null)

const loanForm = ref({ amount: 10_000_000, interestRate: 18, ratePeriod: 'annual_effective', termMonths: 24, existingMonthlyDebt: 0, requestedMonthlyPayment: null, monthlyExpenseReduction: 0 })
const capacityForm = ref({ existingMonthlyDebt: 0 })
const cardForm = ref({ existingMonthlyDebt: 0, requestedCardLimit: 0 })
const cdtForm = ref({ initialAmount: 5_000_000, annualRate: 10, termMonths: 12 })
const savingsForm = ref({ initialAmount: 1_000_000, monthlyContribution: 300_000, annualRate: 8, termMonths: 24 })
const rateTypes = [
  { title: 'Efectiva anual (E.A.)', value: 'annual_effective' },
  { title: 'Mensual vencida', value: 'monthly' },
]
const amortizationHeaders = [
  { title: 'Cuota', key: 'period' },
  { title: 'Pago', key: 'payment', align: 'end' },
  { title: 'Capital', key: 'principal', align: 'end' },
  { title: 'Interés', key: 'interest', align: 'end' },
  { title: 'Saldo', key: 'balance', align: 'end' },
]

const currency = computed(() => authStore.user?.currency || 'COP')
const currencySymbol = computed(() => currency.value === 'COP' ? '$' : currency.value)
const money = (value) => new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: currency.value,
  maximumFractionDigits: 0,
}).format(Number(value || 0))
const compactMoney = (value) => new Intl.NumberFormat('es-CO', {
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(Number(value || 0))
const percent = (value) => `${Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}%`
const formatMonthKey = (value) => {
  if (!value || value === 'Ahora') return value || ''
  const date = new Date(`${value}-01T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}

const percentDisplay = (value) => `${Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`

const principalPercent = computed(() => {
  if (!loanResult.value) return 0
  const total = Number(loanResult.value.totalPaid) || (Number(loanResult.value.amount) + Number(loanResult.value.totalInterest))
  if (!total) return 0
  return Math.round((Number(loanResult.value.amount) / total) * 1000) / 10
})
const interestPercent = computed(() => (loanResult.value ? Math.round((100 - principalPercent.value) * 10) / 10 : 0))

// The "cuota máxima sugerida" comes from the Capacidad crediticia tab's own already-fetched
// result (loaded on mount / when the user evaluates it there), so comparing against it here
// connects both tabs without recalculating anything.
const suggestedMaxPayment = computed(() => capacityResult.value?.capacity?.recommendedMaxPayment ?? null)
const evaluatedPayment = computed(() => loanResult.value?.capacity?.evaluatedMonthlyPayment ?? null)
const paymentExceedsCapacity = computed(() => (
  suggestedMaxPayment.value != null
  && evaluatedPayment.value != null
  && Number(evaluatedPayment.value) > Number(suggestedMaxPayment.value)
))
const capacityExcessAmount = computed(() => (
  paymentExceedsCapacity.value ? Number(evaluatedPayment.value) - Number(suggestedMaxPayment.value) : 0
))

const alertFor = (status) => ({
  supported: { type: 'success', color: 'success', icon: 'mdi-shield-check' },
  caution: { type: 'warning', color: 'warning', icon: 'mdi-alert-outline' },
  not_recommended: { type: 'error', color: 'error', icon: 'mdi-alert-octagon-outline' },
  insufficient_data: { type: 'info', color: 'info', icon: 'mdi-information-outline' },
}[status] || { type: 'info', color: 'info', icon: 'mdi-information-outline' })

const capacityAlert = computed(() => alertFor(loanResult.value?.capacity?.status))

const baseChartOptions = (yLabel) => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: 'index' },
  plugins: { legend: { position: 'bottom' } },
  scales: {
    x: { title: { display: true, text: 'Mes' }, grid: { display: false } },
    y: { beginAtZero: true, title: { display: true, text: yLabel }, ticks: { callback: compactMoney } },
  },
})
const chartOptions = computed(() => baseChartOptions(`Saldo (${currency.value})`))

const loanChartData = computed(() => ({
  labels: loanResult.value.schedule.map((row) => row.period),
  datasets: [{
    label: 'Saldo pendiente',
    data: loanResult.value.schedule.map((row) => row.balance),
    borderColor: '#0b6b5d',
    backgroundColor: 'rgba(11, 107, 93, 0.12)',
    fill: true,
    pointRadius: loanResult.value.termMonths > 60 ? 0 : 2,
    tension: 0.22,
  }],
}))

const runSimulation = async (request, target) => {
  loading.value = true
  try {
    const response = await request()
    target.value = response.data
  } catch (error) {
    snackbar.error(error.response?.data?.message || 'No se pudo realizar la simulación')
  } finally {
    loading.value = false
  }
}

const simulateLoan = () => {
  const input = { ...loanForm.value }
  if (input.requestedMonthlyPayment === null || input.requestedMonthlyPayment === '' || !Number.isFinite(Number(input.requestedMonthlyPayment)) || Number(input.requestedMonthlyPayment) <= 0) {
    delete input.requestedMonthlyPayment
  }
  if (input.monthlyExpenseReduction === null || input.monthlyExpenseReduction === '' || !Number.isFinite(Number(input.monthlyExpenseReduction)) || Number(input.monthlyExpenseReduction) < 0) {
    delete input.monthlyExpenseReduction
  }
  return runSimulation(() => simulationsAPI.loan(input), loanResult)
}
const simulateCdt = () => runSimulation(() => simulationsAPI.cdt(cdtForm.value), cdtResult)
const simulateSavings = () => runSimulation(() => simulationsAPI.savings(savingsForm.value), savingsResult)

const loadCreditCapacity = async () => {
  capacityLoading.value = true
  try {
    const input = { ...capacityForm.value }
    if (input.existingMonthlyDebt === null || input.existingMonthlyDebt === '') delete input.existingMonthlyDebt
    const response = await simulationsAPI.capacity(input)
    capacityResult.value = response.data
  } catch (error) {
    snackbar.error(error.response?.data?.message || 'No se pudo evaluar tu capacidad de endeudamiento')
  } finally {
    capacityLoading.value = false
  }
}

const loadCardViability = async () => {
  cardLoading.value = true
  try {
    const input = { ...cardForm.value }
    if (input.existingMonthlyDebt === null || input.existingMonthlyDebt === '') delete input.existingMonthlyDebt
    if (input.requestedCardLimit === null || input.requestedCardLimit === '') delete input.requestedCardLimit
    const response = await simulationsAPI.cardViability(input)
    cardResult.value = response.data
  } catch (error) {
    snackbar.error(error.response?.data?.message || 'No se pudo evaluar la viabilidad de la tarjeta')
  } finally {
    cardLoading.value = false
  }
}

const openLoanEvaluation = () => {
  loanForm.value.existingMonthlyDebt = Number(capacityForm.value.existingMonthlyDebt || 0)
  tab.value = 'loan'
}

const syncTabFromRoute = () => {
  const requestedTab = String(route.query.tab || '')
  if (['loan', 'cdt', 'savings', 'capacity'].includes(requestedTab)) tab.value = requestedTab
  else if (!requestedTab) tab.value = 'loan'
}

watch(() => route.query.tab, syncTabFromRoute)

onMounted(() => {
  syncTabFromRoute()
  loadCreditCapacity()
})
</script>

<style scoped>
.readiness-gauge {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--finance-line);
}

.readiness-gauge__value {
  color: var(--finance-ink);
  font-size: 1.6rem;
  font-weight: 780;
}

.readiness-gauge__label {
  color: var(--finance-muted);
  font-size: 0.72rem;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.readiness-gauge__title {
  margin-top: 4px;
  color: var(--finance-ink);
  font-size: 1.05rem;
  font-weight: 700;
}

.loan-result-summary {
  margin-bottom: 10px;
  color: var(--finance-muted);
  font-size: 0.78rem;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.loan-hero {
  position: relative;
  overflow: hidden;
  margin-bottom: 18px;
  padding: 22px 24px;
  border-radius: 18px;
  background:
    radial-gradient(circle at 88% 20%, rgba(66, 207, 174, 0.16), transparent 12rem),
    #0C2630;
  box-shadow: 0 16px 34px rgba(10, 65, 65, 0.18);
  color: #fff;
}

.loan-hero__label {
  color: #b8d6d2;
  font-size: 0.78rem;
  font-weight: 650;
}

.loan-hero__value {
  margin-top: 6px;
  font-size: clamp(1.9rem, 4vw, 2.6rem);
  font-weight: 780;
  letter-spacing: -0.03em;
}

.loan-composition {
  margin-bottom: 18px;
}

.loan-composition__legend {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 8px;
  color: var(--finance-muted);
  font-size: 0.78rem;
  font-weight: 650;
}

.loan-composition__dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  margin-right: 6px;
  border-radius: 50%;
  vertical-align: middle;
}

.loan-composition__dot--principal { background: #0C2630; }
.loan-composition__dot--interest { background: #E3A458; }

.loan-composition__bar {
  display: flex;
  height: 16px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--finance-soft);
}

.loan-composition__segment {
  height: 100%;
  transition: width 0.35s ease;
}

.loan-composition__segment--principal { background: #0C2630; }
.loan-composition__segment--interest { background: #E3A458; }

.loan-composition__scale {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  color: var(--finance-muted);
  font-size: 0.72rem;
}

.loan-stat {
  height: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--finance-soft);
}

.loan-stat span {
  display: block;
  color: var(--finance-muted);
  font-size: 0.72rem;
}

.loan-stat strong {
  display: block;
  margin-top: 5px;
  color: var(--finance-ink);
  font-size: clamp(1rem, 2vw, 1.2rem);
}

.simulation-metric {
  height: 100%;
}

.simulation-metric span,
.capacity-grid span {
  display: block;
  color: var(--finance-muted);
  font-size: 0.72rem;
}

.simulation-metric strong {
  display: block;
  margin-top: 5px;
  color: var(--finance-ink);
  font-size: clamp(1rem, 2vw, 1.25rem);
}

.capacity-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.capacity-grid > div {
  padding: 12px;
  border-radius: 12px;
  background: var(--finance-soft);
}

.capacity-grid strong {
  display: block;
  margin-top: 4px;
  color: var(--finance-ink);
  font-size: 1.05rem;
}

.simulation-chart {
  position: relative;
  height: 300px;
}

.simulation-empty {
  min-height: 360px;
}

.simulation-empty .v-card-text {
  display: grid;
  min-height: 360px;
  place-content: center;
  text-align: center;
  color: var(--finance-muted);
}

.simulation-empty h3 {
  margin: 14px 0 4px;
}

@media (max-width: 600px) {
  .capacity-grid {
    grid-template-columns: 1fr;
  }

  .simulation-chart {
    height: 250px;
  }

  .readiness-gauge {
    flex-direction: column;
    text-align: center;
  }
}
</style>

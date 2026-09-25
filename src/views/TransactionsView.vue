<template>
  <div>
    <div data-tour="page-intro" class="page-intro d-flex align-start align-sm-center flex-column flex-sm-row ga-3">
      <div>
        <div class="page-intro__eyebrow">{{ t('transactions.dailyControl') }}</div>
        <h1 :class="isMobile ? 'text-h5' : 'text-h4'">{{ t('nav.transactions') }}</h1>
        <p class="page-intro__subtitle">{{ t('transactions.subtitle') }}</p>
      </div>
      <v-spacer />
      <div v-if="!isMobile" class="d-flex ga-2">
        <v-btn variant="outlined" prepend-icon="mdi-download" data-tour="tx-export" @click="doExport">{{ t('transactions.export') }}</v-btn>
        <v-btn v-if="!billingStore.isReadOnly" data-tour="page-add" color="primary" prepend-icon="mdi-plus" @click="openModeDialog">{{ t('transactions.newTransaction') }}</v-btn>
      </div>
    </div>

    <v-row class="mb-2" dense>
      <v-col cols="12" sm="4">
        <v-card class="tx-summary-card">
          <v-card-text>
            <div class="tx-summary-card__label">{{ t('transactions.totalShown') }}</div>
            <div class="tx-summary-card__value">{{ totalShown < 0 ? '−' : '' }}{{ money(Math.abs(totalShown)) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4">
        <v-card class="tx-summary-card tx-summary-card--light">
          <v-card-text>
            <div class="tx-summary-card__label">{{ t('transactions.transactionsShown') }}</div>
            <div class="tx-summary-card__value tx-summary-card__value--dark">{{ pagedRegisters.length }} <span class="tx-summary-card__of">{{ t('transactions.of', { total: store.registers.length }) }}</span></div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4">
        <v-card class="tx-summary-card tx-summary-card--light">
          <v-card-text>
            <div class="tx-summary-card__label">{{ t('transactions.averagePerTransaction') }}</div>
            <div class="tx-summary-card__value tx-summary-card__value--dark">{{ money(averagePerMovement) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-expansion-panels v-model="filtersOpen" class="mb-2" data-tour="tx-filters">
      <v-expansion-panel>
        <v-expansion-panel-title>
          <div class="d-flex align-center w-100">
            <v-icon class="mr-2">mdi-filter</v-icon> {{ t('transactions.filters') }}
            <v-spacer />
            <div v-if="selected.length" class="tx-selection-bar" @click.stop>
              <span class="text-caption text-medium-emphasis mr-2">{{ t('transactions.selectedCount', { count: selected.length }, selected.length) }}</span>
              <v-btn size="small" variant="text" color="primary" @click="exportSelected">{{ t('transactions.exportSelection') }}</v-btn>
              <v-btn size="small" variant="text" color="error" @click="confirmBulkDelete">{{ t('common.delete') }}</v-btn>
            </div>
          </div>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-row dense>
            <v-col cols="6" sm="3">
              <v-select v-model="filters.type" :items="typeOptions" :label="t('transactions.type')" clearable density="compact" hide-details @update:model-value="load" />
            </v-col>
            <v-col cols="6" sm="3">
              <v-select
                v-model="filters.category"
                :items="categoryOptions"
                :loading="referenceDataLoading"
                :no-data-text="categoryNoDataText"
                item-title="name"
                item-value="_id"
                :label="t('transactions.category')"
                clearable
                density="compact"
                hide-details
                @update:model-value="load"
              />
            </v-col>
            <v-col cols="6" sm="3">
              <v-text-field v-model="filters.startDate" type="date" :label="t('transactions.from')" density="compact" hide-details @update:model-value="load" />
            </v-col>
            <v-col cols="6" sm="3">
              <v-text-field v-model="filters.endDate" type="date" :label="t('transactions.to')" density="compact" hide-details @update:model-value="load" />
            </v-col>
          </v-row>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <!-- Desktop table -->
    <v-card v-if="!isMobile">
      <v-data-table
        v-model="selected"
        :items="pagedRegisters"
        :headers="headers"
        :loading="store.loading"
        item-value="_id"
        show-select
        hide-default-footer
        hover
        :items-per-page="-1"
        :row-props="({ index }) => ({ class: index % 2 === 1 ? 'tx-row--alt' : '' })"
      >
        <template #item.date="{ value }">{{ formatDate(value) }}</template>
        <template #item.type="{ value }">
          <v-chip :color="value === 'income' ? 'income' : 'expense'" size="small" label>{{ value === 'income' ? t('transactions.income') : t('transactions.expense') }}</v-chip>
        </template>
        <template #item.amount="{ value, item }">
          <span :class="item.type === 'income' ? 'text-green' : 'text-red'">{{ item.type === 'income' ? '+' : '-' }}{{ money(value) }}</span>
        </template>
        <template #item.category="{ value }">
          <v-chip size="small" :color="getCategoryColor(value).bg" :style="{ color: getCategoryColor(value).text }">{{ value?.icon }} {{ value?.name }}</v-chip>
        </template>
        <template #item.wallet="{ value }">{{ value?.name || '—' }}</template>
        <template #item.actions="{ item }">
          <v-icon v-if="!billingStore.isReadOnly" size="small" class="mr-2" @click="openEdit(item)">mdi-pencil</v-icon>
          <v-icon v-if="!billingStore.isReadOnly" size="small" color="error" @click="confirmDelete(item)">mdi-delete</v-icon>
        </template>
      </v-data-table>
      <div class="tx-pagination">
        <span class="text-caption text-medium-emphasis">{{ t('transactions.showing', { shown: pagedRegisters.length, total: store.registers.length }) }}</span>
        <div class="d-flex align-center ga-1">
          <v-btn icon="mdi-chevron-left" size="small" variant="text" :disabled="page <= 1" @click="page--" />
          <span class="text-caption">{{ page }} / {{ pageCount }}</span>
          <v-btn icon="mdi-chevron-right" size="small" variant="text" :disabled="page >= pageCount" @click="page++" />
        </div>
      </div>
    </v-card>

    <!-- Mobile card list -->
    <div v-else>
      <v-card v-if="store.registers.length === 0 && !store.loading" class="pa-8 text-center text-grey">
        <v-icon size="x-large" color="grey">mdi-cash-remove</v-icon>
        <div class="mt-2">{{ t('transactions.noTransactions') }}</div>
      </v-card>
      <template v-else>
        <v-list bg-color="transparent" lines="two">
          <v-list-item
            v-for="reg in pagedRegisters"
            :key="reg._id"
            @click="!billingStore.isReadOnly && openEdit(reg)"
          >
            <template #prepend>
              <v-checkbox
                :model-value="selected.includes(reg._id)"
                density="compact"
                hide-details
                class="flex-0-0 mr-1"
                @click.stop
                @update:model-value="(v) => toggleSelected(reg._id, v)"
              />
              <v-avatar :color="reg.type === 'income' ? 'income' : 'expense'" size="40">
                <span class="text-white text-caption">{{ reg.category?.icon || '?' }}</span>
              </v-avatar>
            </template>
            <v-list-item-title>{{ reg.description || reg.category?.name || t('transactions.noDescription') }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ formatDate(reg.date) }} · {{ reg.category?.name }}
              <span v-if="reg.wallet" class="text-caption"> · {{ reg.wallet.name }}</span>
            </v-list-item-subtitle>
            <template #append>
              <div class="text-right">
                <div :class="reg.type === 'income' ? 'text-green' : 'text-red'" class="text-body-1 font-weight-bold">
                  {{ reg.type === 'income' ? '+' : '-' }}{{ money(reg.amount) }}
                </div>
                <div class="text-caption text-grey">{{ reg.type === 'income' ? t('transactions.income') : t('transactions.expense') }}</div>
              </div>
            </template>
          </v-list-item>
        </v-list>
        <div class="tx-pagination">
          <span class="text-caption text-medium-emphasis">{{ t('transactions.showing', { shown: pagedRegisters.length, total: store.registers.length }) }}</span>
          <div class="d-flex align-center ga-1">
            <v-btn icon="mdi-chevron-left" size="small" variant="text" :disabled="page <= 1" @click="page--" />
            <span class="text-caption">{{ page }} / {{ pageCount }}</span>
            <v-btn icon="mdi-chevron-right" size="small" variant="text" :disabled="page >= pageCount" @click="page++" />
          </div>
        </div>
      </template>
    </div>

    <v-dialog v-model="modeDialog" max-width="460" @after-leave="onModeDialogAfterLeave">
      <v-card :title="t('transactions.newTransactionTitle')">
        <v-card-text class="text-center">
          <p class="text-body-2 text-grey mb-4">{{ t('transactions.howToEnter') }}</p>
          <div class="d-flex ga-3 justify-center flex-wrap">
            <v-card variant="outlined" class="pa-4 text-center" style="cursor: pointer; flex: 1 1 120px; min-width: 120px" hover @click="startScan">
              <v-icon size="40" color="primary" class="mb-2">mdi-camera-document</v-icon>
              <div class="text-body-2 font-weight-bold">{{ t('transactions.scanDocument') }}</div>
              <div class="text-caption text-grey">{{ t('transactions.scanDocumentHint') }}</div>
            </v-card>
            <v-card variant="outlined" class="pa-4 text-center" style="cursor: pointer; flex: 1 1 120px; min-width: 120px" hover @click="startStatement">
              <v-icon size="40" color="primary" class="mb-2">mdi-file-document-outline</v-icon>
              <v-badge v-if="newBadge" :content="t('transactions.newBadge')" color="success" offset-x="-32" offset-y="6" />
              <div class="text-body-2 font-weight-bold">{{ t('transactions.uploadStatement') }}</div>
              <div class="text-caption text-grey">{{ t('transactions.uploadStatementHint') }}</div>
            </v-card>
            <v-card variant="outlined" class="pa-4 text-center" style="cursor: pointer; flex: 1 1 120px; min-width: 120px" hover @click="openManualCreate">
              <v-icon size="40" color="primary" class="mb-2">mdi-pencil-box</v-icon>
              <div class="text-body-2 font-weight-bold">{{ t('transactions.typeIn') }}</div>
              <div class="text-caption text-grey">{{ t('transactions.typeInHint') }}</div>
            </v-card>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="modeDialog = false">{{ t('common.cancel') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="statementWalletDialog" max-width="420">
      <v-card :title="t('transactions.uploadStatement')">
        <v-card-text>
          <p class="text-body-2 text-grey mb-3">{{ t('transactions.statementWalletHint') }}</p>
          <NativeSelectField
            v-model="statementWallet"
            :items="walletOptions"
            item-title="name"
            item-value="_id"
            :label="t('transactions.account')"
            :placeholder="t('wallets.selectAccount')"
          />
          <div v-if="bankWalletsHint" class="text-caption text-grey mt-1">{{ bankWalletsHint }}</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="statementWalletDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" :disabled="!statementWallet" prepend-icon="mdi-file-upload" @click="pickStatementPdf">{{ t('transactions.selectPdf') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <input
      ref="pdfFileInput"
      type="file"
      accept="application/pdf"
      style="display: none"
      @change="handleStatementFile"
    />

    <input
      ref="scanFileInput"
      type="file"
      accept="image/*"
      capture="environment"
      style="display: none"
      @change="handleScanFile"
    />

    <v-dialog v-model="scanningOverlay" persistent max-width="300">
      <v-card class="pa-6 text-center">
        <v-progress-circular indeterminate color="primary" size="60" class="mb-3" />
        <div class="text-body-1">{{ scanningMessage }}</div>
        <div class="text-caption text-grey">{{ scanningSubtitle }}</div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialog" :fullscreen="isMobile" max-width="500">
      <v-card :title="editing ? t('transactions.editTransaction') : t('transactions.newTransactionTitle')" class="capture-form">
        <v-card-text>
          <div class="tool-tiles">
            <AISuggestCategory
              :description="form.description"
              :amount="form.amount"
              :type="form.type"
              @suggested="onCategorySuggested"
            />
            <VoiceInputButton @parsed="onVoiceParsed" />
            <ReceiptScanner @scanned="onReceiptScanned" />
          </div>
          <p class="tool-tiles__hint">{{ t('transactions.toolsHint') }}</p>

          <div class="form-divider"><span>{{ t('transactions.orManualEntry') }}</span></div>

          <label class="form-label">{{ t('transactions.type') }}</label>
          <div class="segmented-toggle mb-3">
            <button
              type="button"
              class="segmented-toggle__option segmented-toggle__option--expense"
              :class="{ 'segmented-toggle__option--active': form.type === 'expense' }"
              @click="onTypeChange('expense')"
            >
              {{ t('transactions.expense') }}
            </button>
            <button
              type="button"
              class="segmented-toggle__option segmented-toggle__option--income"
              :class="{ 'segmented-toggle__option--active': form.type === 'income' }"
              @click="onTypeChange('income')"
            >
              {{ t('transactions.income') }}
            </button>
          </div>

          <MoneyField v-model="form.amount" :label="t('wallets.amount')" size="hero" required />

          <label class="form-label mt-2">{{ t('transactions.date') }}</label>
          <div class="chip-row mb-2">
            <button type="button" class="chip-option" :class="{ 'chip-option--active': !showDatePicker && isToday(form.date) }" @click="setDateToday">{{ t('common.today') }}</button>
            <button type="button" class="chip-option" :class="{ 'chip-option--active': !showDatePicker && isYesterday(form.date) }" @click="setDateYesterday">{{ t('transactions.yesterday') }}</button>
            <button type="button" class="chip-option" :class="{ 'chip-option--active': showDatePicker }" @click="showDatePicker = true">
              <v-icon size="14">mdi-calendar</v-icon> {{ t('transactions.choose') }}
            </button>
          </div>
          <v-text-field v-if="showDatePicker" v-model="form.date" type="date" variant="outlined" density="compact" required class="mb-2" />

          <label class="form-label">{{ t('transactions.category') }}</label>
          <div class="chip-row mb-2">
            <button
              v-for="cat in frequentCategories"
              :key="cat._id"
              type="button"
              class="chip-option"
              :class="{ 'chip-option--active': form.category === cat._id }"
              @click="form.category = cat._id"
            >
              <v-icon v-if="form.category === cat._id" size="14">mdi-check</v-icon> {{ cat.name }}
            </button>
            <button type="button" class="chip-option" @click="showAllCategories = !showAllCategories">+ {{ t('transactions.viewAll') }}</button>
          </div>
          <NativeSelectField
            v-if="showAllCategories"
            v-model="form.category"
            :items="filteredCategories"
            :loading="referenceDataLoading"
            :disabled="referenceDataLoading"
            :no-data-text="categoryNoDataText"
            item-title="name"
            item-value="_id"
            :label="t('transactions.category')"
            :placeholder="t('transactions.selectCategory')"
            :loading-text="t('transactions.loadingCategories')"
            :error="!!categoriesError || (attemptedSave && !form.category)"
            required
            class="mb-2"
          />

          <v-text-field v-model="form.description" :label="t('transactions.description')" variant="outlined" density="compact" class="mb-2" />

          <NativeSelectField
            v-model="form.wallet"
            :items="walletOptions"
            item-title="name"
            item-value="_id"
            :label="t('transactions.account')"
            :placeholder="t('transactions.noAccount')"
            :loading="referenceDataLoading"
          />

          <v-btn v-if="!showTagsField" variant="text" size="small" color="primary" class="px-0 mt-1" prepend-icon="mdi-plus" @click="showTagsField = true">
            {{ t('transactions.tag') }}
          </v-btn>
          <v-combobox v-else v-model="form.tags" :items="store.tags.map(t => t.name)" :label="t('transactions.tags')" variant="outlined" density="compact" multiple chips />
        </v-card-text>
        <v-card-actions class="form-actions">
          <v-btn variant="text" @click="dialog = false">{{ t('common.cancel') }}</v-btn>
          <v-spacer />
          <v-btn class="form-actions__primary" @click="save" :loading="saving">{{ t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="reviewDialog" :fullscreen="isMobile" max-width="600">
      <v-card :title="t('transactions.reviewScannedReceipt')">
        <v-card-text>
          <v-row dense class="mb-2">
            <v-col cols="12" sm="6">
              <v-text-field v-model="reviewMerchant" :label="t('transactions.merchant')" density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="reviewDate" :label="t('transactions.date')" type="date" density="compact" />
            </v-col>
          </v-row>
          <NativeSelectField v-model="reviewWallet" :items="walletOptions" item-title="name" item-value="_id" :label="t('transactions.account')" :placeholder="t('wallets.selectAccount')" class="mb-2" />
          <div class="text-subtitle-2 mb-2">{{ t('transactions.detectedItems') }}</div>
          <v-list bg-color="transparent" density="compact">
            <v-list-item v-for="(item, i) in reviewItems" :key="i" class="mb-2 pa-2" rounded elevation="1">
              <div class="d-flex flex-column w-100 ga-1">
                <div class="d-flex align-center ga-2">
                  <v-text-field v-model="item.description" :label="t('transactions.description')" density="compact" hide-details class="flex-grow-1" />
                  <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="removeReviewItem(i)" />
                </div>
                <div class="d-flex ga-2">
                  <v-text-field v-model.number="item.amount" :label="t('wallets.amount')" type="number" density="compact" hide-details style="max-width: 140px" prefix="$" />
                  <NativeSelectField v-model="item.category" :items="expenseCategories" item-title="name" item-value="_id" :label="t('transactions.category')" :placeholder="t('transactions.selectCategory')" class="flex-grow-1" />
                </div>
              </div>
            </v-list-item>
          </v-list>
          <v-btn size="small" variant="text" color="primary" prepend-icon="mdi-plus" @click="addReviewItem" class="mt-1">{{ t('transactions.addItem') }}</v-btn>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="reviewDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" @click="saveReviewedItems" :loading="reviewSaving">{{ t('transactions.confirmCount', { count: reviewItems.length }) }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="statementReviewDialog" :fullscreen="isMobile" max-width="900" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <span>{{ t('transactions.reviewStatement') }}</span>
          <v-spacer />
          <v-chip size="small" color="info">{{ t('transactions.rowsCount', { count: statementContext.summary.detected }, statementContext.summary.detected) }}</v-chip>
          <v-chip size="small" color="grey" class="ml-2">{{ t('transactions.duplicatesCount', { count: statementContext.summary.duplicates }, statementContext.summary.duplicates) }}</v-chip>
          <v-chip size="small" color="success" class="ml-2">{{ t('transactions.toImportCount', { count: selectedStatementRows.length }, selectedStatementRows.length) }}</v-chip>
        </v-card-title>
        <v-card-text>
          <v-alert v-if="statementContext.summary.duplicates > 0" type="info" variant="tonal" density="compact" class="mb-3">
            {{ t('transactions.duplicateRowsNotice') }}
          </v-alert>
          <div v-if="statementContext.period && statementContext.period.start" class="text-caption text-grey mb-2">
            {{ t('transactions.period', { start: statementContext.period.start, end: statementContext.period.end }) }}
          </div>
          <v-list v-if="!isMobile" bg-color="transparent" density="compact" lines="one">
            <v-list-item v-for="(row, i) in statementRows" :key="i" class="mb-1 pa-2" rounded elevation="1" :class="{ 'text-grey': !row.selected }">
              <div class="d-flex align-center ga-2 w-100">
                <v-checkbox v-model="row.selected" density="compact" hide-details class="flex-0-0" />
                <v-text-field v-model="row.date" type="date" density="compact" hide-details style="max-width: 150px" />
                <v-text-field v-model="row.description" :label="t('transactions.description')" density="compact" hide-details class="flex-grow-1" />
                <NativeSelectField v-model="row.type" :items="typeOptions" item-title="title" item-value="value" :label="t('transactions.type')" style="max-width: 110px" />
                <v-text-field v-model.number="row.amount" type="number" prefix="$" density="compact" hide-details style="max-width: 110px" />
                <NativeSelectField v-model="row.category" :items="categoriesForType(row.type)" item-title="name" item-value="_id" :label="t('transactions.category')" :placeholder="t('transactions.selectCategory')" class="flex-grow-1" />
                <v-chip v-if="row.duplicate" size="small" color="grey" label>{{ t('transactions.duplicate') }}</v-chip>
                <v-chip v-else size="small" color="success" label>{{ t('transactions.newRow') }}</v-chip>
              </div>
            </v-list-item>
          </v-list>
          <v-list v-else bg-color="transparent" density="compact" lines="two">
            <v-list-item v-for="(row, i) in statementRows" :key="i" class="mb-2 pa-2" rounded elevation="1" :class="{ 'text-grey': !row.selected }">
              <div class="d-flex flex-column ga-2 w-100">
                <div class="d-flex align-center ga-2">
                  <v-checkbox v-model="row.selected" density="compact" hide-details class="flex-0-0" />
                  <v-text-field v-model="row.description" :label="t('transactions.description')" density="compact" hide-details class="flex-grow-1" />
                  <v-chip v-if="row.duplicate" size="small" color="grey" label>{{ t('transactions.duplicate') }}</v-chip>
                  <v-chip v-else size="small" color="success" label>{{ t('transactions.newRow') }}</v-chip>
                </div>
                <div class="d-flex ga-2 flex-wrap">
                  <v-text-field v-model="row.date" type="date" :label="t('transactions.date')" density="compact" hide-details style="max-width: 150px" />
                  <NativeSelectField v-model="row.type" :items="typeOptions" item-title="title" item-value="value" :label="t('transactions.type')" style="max-width: 130px" />
                  <v-text-field v-model.number="row.amount" type="number" prefix="$" :label="t('wallets.amount')" density="compact" hide-details style="max-width: 130px" />
                  <NativeSelectField v-model="row.category" :items="categoriesForType(row.type)" item-title="name" item-value="_id" :label="t('transactions.category')" :placeholder="t('transactions.selectCategory')" class="flex-grow-1" />
                </div>
              </div>
            </v-list-item>
          </v-list>
          <div class="text-caption text-grey mt-3">
            {{ t('transactions.totalToImport') }}: <strong>{{ money(statementImportTotal) }}</strong>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelStatementReview">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" :disabled="selectedStatementRows.length === 0" :loading="statementImporting" @click="confirmImport">
            {{ t('transactions.confirmCount', { count: selectedStatementRows.length }) }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>{{ t('wallets.confirm') }}</v-card-title>
        <v-card-text>{{ t('transactions.deleteTransactionConfirm') }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="error" @click="doDelete" :loading="deleting">{{ t('common.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="bulkDeleteDialog" max-width="400">
      <v-card>
        <v-card-title>{{ t('wallets.confirm') }}</v-card-title>
        <v-card-text>{{ t('transactions.deleteBulkConfirm', { count: selected.length }, selected.length) }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="bulkDeleteDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="error" @click="doBulkDelete" :loading="deleting">{{ t('common.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-btn
      v-if="isMobile && !billingStore.isReadOnly"
      icon="mdi-plus"
      color="primary"
      size="x-large"
      class="finance-fab" data-tour="page-add"
      @click="openModeDialog"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { useRegistersStore } from '@/stores/registers'
import { useSnackbar } from '@/stores/snackbar'
import { useSubscriptionStore } from '@/stores/subscriptions'
import { useAuthStore } from '@/stores/auth'
import { useLocale } from '@/composables/useLocale'
import { categoriesAPI, walletsAPI, aiAPI, statementsAPI, recurringAPI } from '@/api'
import AISuggestCategory from '@/components/AISuggestCategory.vue'
import VoiceInputButton from '@/components/VoiceInputButton.vue'
import ReceiptScanner from '@/components/ReceiptScanner.vue'
import NativeSelectField from '@/components/NativeSelectField.vue'
import MoneyField from '@/components/MoneyField.vue'
import { readAndCompressImage } from '@/utils/imageUtils'
import { getCategoryColor } from '@/constants/categoryColors'

const { t } = useI18n()
const { money, date } = useLocale()
const route = useRoute()
const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)

const store = useRegistersStore()
const snackbar = useSnackbar()
const billingStore = useSubscriptionStore()
const authStore = useAuthStore()

// Escanear/subir extracto envían el archivo a un proveedor de IA de terceros
// (OpenAI/Gemini) — Apple exige que la app pida permiso antes de eso, no solo que
// lo documente en la política de privacidad. Ver AIConsentDialog.vue.
const requireAIConsent = () => {
  if (authStore.hasAcceptedAIConsent) return true
  modeDialog.value = false
  snackbar.error(t('transactions.aiConsentRequired'))
  return false
}

const now = new Date()
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
const filters = ref({ type: null, category: null, startDate: monthStart, endDate: monthEnd })
const filtersOpen = ref([])
const dialog = ref(false)
const deleteDialog = ref(false)
const bulkDeleteDialog = ref(false)
const editing = ref(null)
const saving = ref(false)
const deleting = ref(false)
const toDelete = ref(null)
const selected = ref([])
const page = ref(1)
const PAGE_SIZE = 15
const attemptedSave = ref(false)
const categories = ref([])
const wallets = ref([])
const referenceDataLoading = ref(false)
const categoriesError = ref('')
const reviewDialog = ref(false)
const reviewSaving = ref(false)
const reviewMerchant = ref('')
const reviewDate = ref('')
const reviewWallet = ref(null)
const reviewItems = ref([])
const modeDialog = ref(false)
const pendingManualCreate = ref(false)
const scanningOverlay = ref(false)
const scanningMessage = ref(t('transactions.scanningReceipt'))
const scanningSubtitle = ref(t('transactions.processingImage'))
const scanFileInput = ref(null)
const newBadge = ref(true)

const statementWalletDialog = ref(false)
const statementWallet = ref(null)
const pdfFileInput = ref(null)
const statementReviewDialog = ref(false)
const statementRows = ref([])
const statementImporting = ref(false)
const statementContext = ref({
  statementId: null,
  wallet: null,
  period: {},
  summary: { detected: 0, duplicates: 0, new: 0 },
})

const form = ref({ type: 'expense', amount: 0, date: new Date().toISOString().slice(0, 10), category: null, description: '', wallet: null, tags: [] })
const typeOptions = computed(() => [{ title: t('transactions.income'), value: 'income' }, { title: t('transactions.expense'), value: 'expense' }])

const showAllCategories = ref(false)
const showDatePicker = ref(false)
const showTagsField = ref(false)

const LAST_WALLET_KEY = 'mm_last_wallet'
const getLastWallet = () => localStorage.getItem(LAST_WALLET_KEY)
const setLastWallet = (id) => { if (id) localStorage.setItem(LAST_WALLET_KEY, id) }

const todayISO = () => new Date().toISOString().slice(0, 10)
const yesterdayISO = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10) }
const isToday = (date) => date === todayISO()
const isYesterday = (date) => date === yesterdayISO()
const setDateToday = () => { form.value.date = todayISO(); showDatePicker.value = false }
const setDateYesterday = () => { form.value.date = yesterdayISO(); showDatePicker.value = false }

const filteredCategories = computed(() => categories.value.filter(c => !form.value.type || c.type === form.value.type))
// "Más usadas" is derived from the transactions already loaded for the active filter
// (no per-category usage counter exists in the backend) — a reasonable approximation
// without adding a new endpoint just for this chip row.
const frequentCategories = computed(() => {
  const counts = {}
  for (const r of store.registers) {
    if (r.type !== form.value.type || !r.category?._id) continue
    counts[r.category._id] = (counts[r.category._id] || 0) + 1
  }
  const ranked = Object.keys(counts).sort((a, b) => counts[b] - counts[a])
  const byId = (id) => filteredCategories.value.find((c) => c._id === id)
  const fromHistory = ranked.map(byId).filter(Boolean)
  return fromHistory.length ? fromHistory.slice(0, 4) : filteredCategories.value.slice(0, 4)
})
const categoryOptions = computed(() => categories.value.filter(c => !filters.value.type || c.type === filters.value.type))
const categoryNoDataText = computed(() => {
  if (categoriesError.value) return categoriesError.value
  if (referenceDataLoading.value) return t('transactions.loadingCategories')
  return t('transactions.noCategoriesForType')
})
const walletOptions = computed(() => wallets.value)
const expenseCategories = computed(() => categories.value.filter(c => c.type === 'expense'))
const bankWallets = computed(() => wallets.value.filter(w => w.type === 'bank'))
const bankWalletsHint = computed(() => {
  if (bankWallets.value.length === 0) return t('transactions.noBankWalletsHint')
  return t('transactions.pickBankWalletHint')
})
const categoriesForType = (type) => categories.value.filter(c => !type || c.type === type)
const selectedStatementRows = computed(() => statementRows.value.filter(r => r.selected && r.category))
const statementImportTotal = computed(() =>
  selectedStatementRows.value
    .filter(r => r.type === 'income')
    .reduce((s, r) => s + (Number(r.amount) || 0), 0)
  - selectedStatementRows.value
    .filter(r => r.type === 'expense')
    .reduce((s, r) => s + (Number(r.amount) || 0), 0)
)

const headers = computed(() => [
  { title: t('transactions.date'), key: 'date' },
  { title: t('transactions.type'), key: 'type' },
  { title: t('transactions.category'), key: 'category' },
  { title: t('transactions.description'), key: 'description' },
  { title: t('transactions.account'), key: 'wallet' },
  { title: t('wallets.amount'), key: 'amount' },
  { title: '', key: 'actions', sortable: false, width: 80 },
])

const PROCESS_THROTTLE_KEY = 'mm_last_recurring_process'
const tryProcessRecurring = () => {
  const last = localStorage.getItem(PROCESS_THROTTLE_KEY)
  if (last && Date.now() - Number(last) < 60 * 60 * 1000) return
  localStorage.setItem(PROCESS_THROTTLE_KEY, String(Date.now()))
  recurringAPI.processRecurring().catch(() => {})
}

const formatDate = (d) => d ? date(d) : ''

const pageCount = computed(() => Math.max(1, Math.ceil(store.registers.length / PAGE_SIZE)))
const pagedRegisters = computed(() => store.registers.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))

const totalShown = computed(() => store.registers.reduce(
  (sum, r) => sum + (r.type === 'income' ? Number(r.amount) || 0 : -(Number(r.amount) || 0)), 0
))
const averagePerMovement = computed(() => {
  if (store.registers.length === 0) return 0
  const totalAbs = store.registers.reduce((sum, r) => sum + Math.abs(Number(r.amount) || 0), 0)
  return totalAbs / store.registers.length
})

const toggleSelected = (id, value) => {
  selected.value = value ? [...selected.value, id] : selected.value.filter((s) => s !== id)
}

const exportSelected = () => {
  const rows = store.registers.filter((r) => selected.value.includes(r._id))
  // Escapes quotes and neutralises spreadsheet formulas (=, +, -, @) so a description can't
  // run as a formula when the file is opened in Excel. Numbers are left as numbers.
  const escape = (value) => {
    if (typeof value === 'number') return String(value)
    let text = String(value ?? '')
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
    return `"${text.replace(/"/g, '""')}"`
  }
  const header = [t('transactions.date'), t('transactions.type'), t('transactions.category'), t('transactions.description'), t('transactions.account'), t('wallets.amount')]
  const lines = rows.map((r) => [
    formatDate(r.date),
    r.type === 'income' ? t('transactions.income') : t('transactions.expense'),
    r.category?.name || '',
    r.description || '',
    r.wallet?.name || '',
    r.amount,
  ].map(escape).join(','))
  const csv = [header.join(','), ...lines].join('\n')
  const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'movimientos-seleccionados.csv')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

const confirmBulkDelete = () => { bulkDeleteDialog.value = true }
const doBulkDelete = async () => {
  deleting.value = true
  try {
    for (const id of selected.value) await store.remove(id)
    snackbar.success(t('transactions.bulkDeleted', { count: selected.value.length }, selected.value.length))
    selected.value = []
  } catch {
    snackbar.error(t('transactions.bulkDeleteError'))
  }
  deleting.value = false
  bulkDeleteDialog.value = false
}

const load = () => {
  const params = {}
  if (filters.value.type) params.type = filters.value.type
  if (filters.value.category) params.category = filters.value.category
  if (filters.value.startDate) params.startDate = filters.value.startDate
  if (filters.value.endDate) params.endDate = filters.value.endDate
  page.value = 1
  selected.value = []
  store.fetchAll(params)
  store.fetchTags()
  tryProcessRecurring()
}

const doExport = () => store.exportCSV({})

const openModeDialog = () => {
  modeDialog.value = true
}

const openManualCreate = () => {
  editing.value = null
  attemptedSave.value = false
  showAllCategories.value = false
  showDatePicker.value = false
  showTagsField.value = false
  form.value = {
    type: 'expense',
    amount: 0,
    date: todayISO(),
    category: null,
    description: '',
    wallet: getLastWallet() || walletOptions.value[0]?._id || null,
    tags: [],
  }
  if (modeDialog.value) {
    pendingManualCreate.value = true
    modeDialog.value = false
  } else {
    dialog.value = true
  }
}

const onModeDialogAfterLeave = () => {
  if (!pendingManualCreate.value) return
  pendingManualCreate.value = false
  dialog.value = true
}

const openCreate = openManualCreate

const startScan = () => {
  if (!requireAIConsent()) return
  modeDialog.value = false
  scanFileInput.value?.click()
}

const handleScanFile = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  scanningOverlay.value = true
  scanningMessage.value = t('transactions.scanningReceipt')
  scanningSubtitle.value = t('transactions.processingImage')
  try {
    const base64 = await readAndCompressImage(file)
    const res = await aiAPI.scanReceipt(base64)
    onReceiptScanned(res.data)
    if (!reviewDialog.value) {
      dialog.value = true
    }
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || t('transactions.scanReceiptError')
    snackbar.error(msg)
  }
  scanningOverlay.value = false
  event.target.value = ''
}

const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => {
    const result = reader.result
    const commaIdx = result.indexOf(',')
    resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result)
  }
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(file)
})

const MAX_PDF_MB = 8

const startStatement = () => {
  if (!requireAIConsent()) return
  modeDialog.value = false
  statementWallet.value = form.value.wallet
  statementWalletDialog.value = true
}

const pickStatementPdf = () => {
  if (!statementWallet.value) {
    snackbar.error(t('transactions.selectStatementAccount'))
    return
  }
  statementWalletDialog.value = false
  newBadge.value = false
  pdfFileInput.value?.click()
}

const handleStatementFile = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  if (file.type && file.type !== 'application/pdf') {
    snackbar.error(t('transactions.fileMustBePdf'))
    event.target.value = ''
    return
  }
  if (file.size > MAX_PDF_MB * 1024 * 1024) {
    snackbar.error(t('transactions.pdfTooLarge', { max: MAX_PDF_MB }))
    event.target.value = ''
    return
  }
  scanningOverlay.value = true
  scanningMessage.value = t('transactions.analyzingStatement')
  scanningSubtitle.value = t('transactions.readingPdf')
  try {
    const pdfBase64 = await readFileAsBase64(file)
    const res = await statementsAPI.analyze({ wallet: statementWallet.value, pdf: pdfBase64, filename: file.name })
    const data = res.data
    statementContext.value = {
      statementId: data.statementId,
      wallet: data.wallet,
      period: data.period || {},
      summary: data.summary || { detected: 0, duplicates: 0, new: 0 },
    }
    statementRows.value = data.rows.map(r => ({
      date: r.date,
      description: r.description || '',
      amount: Number(r.amount) || 0,
      type: r.type || 'expense',
      category: r.category || null,
      duplicate: !!r.duplicate,
      selected: r.selected !== undefined ? !!r.selected : !r.duplicate,
      suggestedCategory: r.suggestedCategory || '',
    }))
    statementReviewDialog.value = true
    if (statementContext.value.summary.duplicates > 0) {
      snackbar.info(t('transactions.duplicatesSkipped', { count: statementContext.value.summary.duplicates }, statementContext.value.summary.duplicates))
    }
  } catch (err) {
    const status = err?.response?.status
    const msg = err?.response?.data?.message || err?.message || t('transactions.analyzeStatementError')
    if (status === 413) snackbar.error(t('transactions.pdfExceedsLimit', { max: MAX_PDF_MB }))
    else if (status === 422) snackbar.error(t('transactions.noTransactionsDetected'))
    else if (status === 429) snackbar.error(t('transactions.dailyQuotaReached'))
    else snackbar.error(msg)
  }
  scanningOverlay.value = false
  event.target.value = ''
}

const cancelStatementReview = () => {
  statementReviewDialog.value = false
  statementRows.value = []
}

const confirmImport = async () => {
  const items = selectedStatementRows.value
  if (items.length === 0) {
    snackbar.error(t('transactions.selectAtLeastOneValid'))
    return
  }
  const missingCategory = items.find(r => !r.category)
  if (missingCategory) {
    snackbar.error(t('transactions.allNeedCategory'))
    return
  }
  statementImporting.value = true
  try {
    const res = await statementsAPI.import({
      statementId: statementContext.value.statementId,
      items: items.map(r => ({
        date: r.date,
        description: r.description,
        amount: r.amount,
        type: r.type,
        category: r.category,
      })),
    })
    const created = res.data?.created || items.length
    statementReviewDialog.value = false
    statementRows.value = []
    snackbar.success(t('transactions.statementImported', { count: created }, created))
    load()
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || t('transactions.importStatementError')
    snackbar.error(msg)
  }
  statementImporting.value = false
}

const openEdit = (item) => {
  editing.value = item._id
  attemptedSave.value = false
  form.value = {
    type: item.type, amount: item.amount,
    date: item.date ? new Date(item.date).toISOString().slice(0, 10) : '',
    category: item.category?._id || null, description: item.description,
    wallet: item.wallet?._id || null, tags: item.tags || [],
  }
  showAllCategories.value = !frequentCategories.value.some((c) => c._id === form.value.category)
  showDatePicker.value = !isToday(form.value.date) && !isYesterday(form.value.date)
  showTagsField.value = form.value.tags.length > 0
  dialog.value = true
}

const save = async () => {
  attemptedSave.value = true
  if (!form.value.category) {
    showAllCategories.value = true
    snackbar.error(t('transactions.selectCategoryError'))
    return
  }

  saving.value = true
  try {
    if (editing.value) {
      await store.update(editing.value, form.value)
      snackbar.success(t('transactions.transactionUpdated'))
    } else {
      await store.create(form.value)
      setLastWallet(form.value.wallet)
      snackbar.success(t('transactions.transactionCreated'))
    }
    dialog.value = false
    load()
  } catch (err) {
    snackbar.error(err?.response?.data?.message || t('transactions.saveError'))
  }
  saving.value = false
}

const confirmDelete = (item) => { toDelete.value = item._id; deleteDialog.value = true }

const onCategorySuggested = (data) => {
  const cat = categories.value.find((c) => c.name.toLowerCase() === data.category?.toLowerCase())
  if (cat) form.value.category = cat._id
  snackbar.info(t('transactions.aiSuggests', { category: data.category, confidence: Math.round(data.confidence * 100) }))
}

const onVoiceParsed = (data) => {
  form.value.type = data.type || 'expense'
  form.value.amount = data.amount || 0
  form.value.description = data.description || ''
  if (data.date) form.value.date = data.date
  const hint = data.category_hint
  if (hint) {
    const cat = categories.value.find((c) => c.name.toLowerCase().includes(hint.toLowerCase()))
    if (cat) form.value.category = cat._id
  }
  snackbar.success(t('transactions.voiceProcessed'))
}

const onReceiptScanned = (data) => {
  const detailedItems = data.items?.filter(i => typeof i === 'object' && i.amount)
  if (detailedItems?.length > 0) {
    reviewMerchant.value = data.merchant || t('transactions.receipt')
    reviewDate.value = data.date || new Date().toISOString().slice(0, 10)
    reviewWallet.value = form.value.wallet
    reviewItems.value = detailedItems.map(item => ({
      description: item.description || '',
      amount: item.amount || 0,
      category_hint: item.category_hint || '',
      category: matchCategory(item.category_hint || data.category_hint || '', 'expense'),
    }))
    reviewDialog.value = true
  } else {
    form.value.amount = data.amount || 0
    form.value.description = data.merchant || data.items?.join(', ') || ''
    if (data.date) form.value.date = data.date
    const hint = data.category_hint
    if (hint) {
      const cat = categories.value.find((c) => c.name.toLowerCase().includes(hint.toLowerCase()))
      if (cat) form.value.category = cat._id
    }
    snackbar.success(t('transactions.receiptScanned'))
  }
}

const matchCategory = (hint, type) => {
  if (!hint) return null
  const cats = categories.value.filter(c => c.type === type)
  const exact = cats.find(c => c.name.toLowerCase() === hint.toLowerCase())
  if (exact) return exact._id
  const partial = cats.find(c => c.name.toLowerCase().includes(hint.toLowerCase()))
  return partial?._id || null
}

const saveReviewedItems = async () => {
  reviewSaving.value = true
  let count = 0
  try {
    for (const item of reviewItems.value) {
      await store.create({
        type: 'expense',
        amount: item.amount,
        description: `${reviewMerchant.value} - ${item.description}`,
        date: reviewDate.value,
        category: item.category,
        wallet: reviewWallet.value || null,
        tags: [],
      })
      count++
    }
    reviewDialog.value = false
    snackbar.success(t('transactions.receiptItemsCreated', { count }, count))
    load()
  } catch (err) {
    snackbar.error(err?.response?.data?.message || t('transactions.receiptItemsError'))
  }
  reviewSaving.value = false
}

const removeReviewItem = (i) => { reviewItems.value.splice(i, 1) }
const addReviewItem = () => { reviewItems.value.push({ description: '', amount: 0, category: null, category_hint: '' }) }

const doDelete = async () => {
  deleting.value = true
  try {
    await store.remove(toDelete.value)
    snackbar.success(t('transactions.transactionDeleted'))
  } catch { snackbar.error(t('transactions.deleteError')) }
  deleting.value = false
  deleteDialog.value = false
}

const onTypeChange = (value) => { form.value.type = value; form.value.category = null }

const loadReferenceData = async () => {
  referenceDataLoading.value = true
  categoriesError.value = ''

  const [categoriesResult, walletsResult] = await Promise.allSettled([
    categoriesAPI.getAll(),
    walletsAPI.getAll(),
  ])

  if (categoriesResult.status === 'fulfilled' && Array.isArray(categoriesResult.value.data)) {
    categories.value = categoriesResult.value.data
  } else {
    categories.value = []
    categoriesError.value = t('transactions.loadCategoriesError')
    snackbar.error(categoriesError.value)
  }

  if (walletsResult.status === 'fulfilled' && Array.isArray(walletsResult.value.data)) {
    wallets.value = walletsResult.value.data
  } else {
    wallets.value = []
    snackbar.error(t('transactions.loadAccountsError'))
  }

  referenceDataLoading.value = false
}

onMounted(async () => {
  await load()
  await loadReferenceData()
  if (route.query.create === '1') {
    if (!billingStore.isReadOnly) openCreate()
    const url = new URL(window.location.href)
    url.searchParams.delete('create')
    window.history.replaceState({}, '', url.toString())
  }
})
</script>

<style scoped>
.tx-summary-card {
  border: 0 !important;
  background: #0C2630 !important;
}

.tx-summary-card--light {
  background: #fff !important;
}

.tx-summary-card__label {
  color: #a8c8c4;
  font-size: 0.72rem;
  font-weight: 650;
}

.tx-summary-card--light .tx-summary-card__label {
  color: var(--finance-muted);
}

.tx-summary-card__value {
  margin-top: 6px;
  color: #fff;
  font-size: 1.35rem;
  font-weight: 760;
  letter-spacing: -0.02em;
}

.tx-summary-card__value--dark {
  color: var(--finance-ink);
}

.tx-summary-card__of {
  color: var(--finance-muted);
  font-size: 0.85rem;
  font-weight: 500;
}

.tx-selection-bar {
  display: flex;
  align-items: center;
}


.tx-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid var(--finance-line);
}

:deep(.tx-row--alt) {
  background: #F7FAFA;
}
</style>

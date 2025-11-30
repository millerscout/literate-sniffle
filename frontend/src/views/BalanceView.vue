<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface StoreSummary {
  storeId: string
  ownerName: string
  storeName: string
  transactionCount: number
  totalIncome: number
  totalExpense: number
  balance: number
}

interface TransactionDetail {
  id: string
  transactionType: string
  transactionCode: number
  nature: string
  sign: string
  date: string
  formattedDate: string
  value: number
  formattedValue: string
  cpf: string
  card: string
  time: string
  formattedTime: string
  storeName: string
  storeOwner: string
  storeId: string
  fileId: string
}

const stores = ref<StoreSummary[]>([])
const selectedStoreId = ref<string | null>(null)
const transactionDetails = ref<TransactionDetail[]>([])
const isLoading = ref(false)
const isLoadingDetails = ref(false)
const error = ref<string>('')

const fetchStoreBalances = async () => {
  isLoading.value = true
  error.value = ''

  try {
    const response = await fetch('/api/stores/summary')
    if (!response.ok) {
      throw new Error(`Failed to fetch store balances: ${response.statusText}`)
    }

    const data = await response.json()
    stores.value = data.stores || []
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load store balances'
    console.error('Error fetching store balances:', err)
  } finally {
    isLoading.value = false
  }
}

const fetchTransactionDetails = async (storeId: string) => {
  isLoadingDetails.value = true

  try {
    const response = await fetch(`/api/transactions/store/${storeId}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch transaction details: ${response.statusText}`)
    }

    const data = await response.json()
    const transactions = data.transactions || []
    
    // Map API response to expected format
    transactionDetails.value = transactions.map((t: any) => {
      const datetime = new Date(t.datetime)
      const nature = t.transactionType?.nature || 'Unknown'
      const sign = nature === 'Income' ? '+' : nature === 'Expense' ? '-' : ''
      
      return {
        id: t.id,
        transactionType: t.transactionType?.name || t.type || 'Unknown',
        transactionCode: t.transactionType?.code || 0,
        nature,
        sign,
        date: datetime.toISOString().split('T')[0],
        formattedDate: datetime.toLocaleDateString('pt-BR'),
        value: Math.abs(t.value || 0),
        formattedValue: formatCurrency(Math.abs(t.value || 0)),
        cpf: t.cpf || 'N/A',
        card: t.card || 'N/A',
        time: datetime.toTimeString().split(' ')[0],
        formattedTime: datetime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        storeName: t.store?.name || '',
        storeOwner: t.store?.ownerName || '',
        storeId: t.storeId
      }
    })
  } catch (err) {
    console.error('Error fetching transaction details:', err)
    transactionDetails.value = []
  } finally {
    isLoadingDetails.value = false
  }
}

const toggleStoreDetails = async (storeId: string) => {
  if (selectedStoreId.value === storeId) {
    // Collapse if already selected
    selectedStoreId.value = null
    transactionDetails.value = []
  } else {
    // Expand new store
    selectedStoreId.value = storeId
    await fetchTransactionDetails(storeId)
  }
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const getBalanceColor = (balance: number): string => {
  if (balance > 0) return '#28a745' // green for positive
  if (balance < 0) return '#dc3545' // red for negative
  return '#6c757d' // gray for zero
}

const getTransactionTypeColor = (nature?: string): string => {
  if (!nature) return '#6c757d' // gray for unknown
  return nature === 'Income' ? '#28a745' : '#dc3545'
}

onMounted(() => {
  fetchStoreBalances()
})
</script>

<template>
  <div class="balance-section">
    <h2>Store Balances</h2>

    <div class="actions">
      <button @click="fetchStoreBalances" :disabled="isLoading" class="refresh-btn">
        {{ isLoading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-if="isLoading" class="loading">
      Loading store balances...
    </div>

    <div v-else-if="stores.length === 0" class="empty-state">
      No stores found. Upload some CNAB files to see balances.
    </div>

    <div v-else class="balance-table-container">
      <table class="balance-table">
        <thead>
          <tr>
            <th>Store Owner</th>
            <th>Store Name</th>
            <th>Transactions</th>
            <th>Total Balance</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="store in stores"
            :key="store.storeId"
            :class="{ 'selected-row': selectedStoreId === store.storeId }"
          >
            <td>{{ store.ownerName }}</td>
            <td>{{ store.storeName }}</td>
            <td class="transaction-count">{{ store.transactionCount }}</td>
            <td :class="['balance-amount', { positive: store.balance > 0, negative: store.balance < 0 }]">
              {{ formatCurrency(store.balance) }}
            </td>
            <td>
              <button
                @click="toggleStoreDetails(store.storeId)"
                class="details-btn"
                :disabled="isLoadingDetails && selectedStoreId === store.storeId"
              >
                {{ selectedStoreId === store.storeId ? 'Hide Details' : 'Show Details' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Transaction Details Section -->
      <div v-if="selectedStoreId && transactionDetails.length > 0" class="transaction-details">
        <h3>Transaction Details</h3>

        <div v-if="isLoadingDetails" class="loading-details">
          Loading transaction details...
        </div>

        <div v-else class="transactions-table-container">
          <table class="transactions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Type</th>
                <th>Value</th>
                <th>CPF</th>
                <th>Card</th>
                <th>Nature</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="transaction in transactionDetails" 
                :key="transaction.id"
                :class="['transaction-row', (transaction.nature || 'unknown').toLowerCase()]"
              >
                <td>{{ transaction.formattedDate || transaction.date || 'N/A' }}</td>
                <td>{{ transaction.formattedTime || transaction.time || 'N/A' }}</td>
                <td>
                  <span class="transaction-type" :style="{ color: getTransactionTypeColor(transaction.nature) }">
                    {{ transaction.transactionType || 'Unknown' }}
                  </span>
                </td>
                <td :class="['transaction-value', { positive: transaction.sign === '+', negative: transaction.sign === '-' }]">
                  {{ transaction.sign || '' }}{{ formatCurrency(Math.abs(transaction.value || 0)) }}
                </td>
                <td class="cpf">{{ transaction.cpf || 'N/A' }}</td>
                <td class="card">{{ transaction.card || 'N/A' }}</td>
                <td>
                  <span :class="['nature-badge', (transaction.nature || 'unknown').toLowerCase()]">
                    {{ transaction.nature || 'Unknown' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else-if="selectedStoreId && !isLoadingDetails" class="no-transactions">
        No transactions found for this store.
      </div>
    </div>
  </div>
</template>

<style scoped>
.balance-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.balance-section h2 {
  color: #42b883;
  margin-bottom: 1.5rem;
}

.balance-section h3 {
  color: #42b883;
  margin: 2rem 0 1rem 0;
  font-size: 1.2rem;
}

.actions {
  margin-bottom: 1rem;
}

.refresh-btn {
  background: #42b883;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.3s;
}

.refresh-btn:hover:not(:disabled) {
  background: #369870;
}

.refresh-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  padding: 0.75rem;
  margin-bottom: 1rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #6c757d;
  font-style: italic;
}

.loading-details {
  text-align: center;
  padding: 1rem;
  color: #6c757d;
  font-style: italic;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #6c757d;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.no-transactions {
  text-align: center;
  padding: 1rem;
  color: #6c757d;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #dee2e6;
  margin-top: 1rem;
}

.balance-table-container {
  overflow-x: auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  margin-bottom: 2rem;
}

.balance-table {
  width: 100%;
  border-collapse: collapse;
}

.balance-table th,
.balance-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #dee2e6;
}

.balance-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #495057;
  border-bottom: 2px solid #dee2e6;
}

.balance-table tbody tr {
  cursor: pointer;
  transition: background 0.2s;
}

.balance-table tbody tr:hover {
  background: #f8f9fa;
}

.balance-table tbody tr.selected-row {
  background: #e3f2fd;
  border-left: 4px solid #42b883;
}

.transaction-count {
  text-align: center;
  font-weight: 500;
}

.balance-amount {
  text-align: right;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.balance-amount.positive {
  color: #28a745;
}

.balance-amount.negative {
  color: #dc3545;
}

.details-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background 0.3s;
}

.details-btn:hover:not(:disabled) {
  background: #0056b3;
}

.details-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Transaction Details Section */
.transaction-details {
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f8f9fa;
  padding: 1rem;
  margin-top: 1rem;
}

.transactions-table-container {
  overflow-x: auto;
  background: white;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.transactions-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.transactions-table th,
.transactions-table td {
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid #dee2e6;
}

.transactions-table th {
  background: #e9ecef;
  font-weight: 600;
  color: #495057;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.transactions-table tbody tr:hover {
  background: #f8f9fa;
}

.transaction-row.income {
  background: rgba(40, 167, 69, 0.2);
  border-left: 4px solid #28a745;
}

.transaction-row.expense {
  background: rgba(220, 53, 69, 0.2);
  border-left: 4px solid #dc3545;
}

.transaction-row.unknown {
  background: rgba(108, 117, 125, 0.1);
  border-left: 4px solid #6c757d;
}

.transaction-type {
  font-weight: 500;
}

.transaction-value {
  text-align: right;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.transaction-value.positive {
  color: #28a745;
}

.transaction-value.negative {
  color: #dc3545;
}

.cpf {
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
}

.card {
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
}

.nature-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
}

.nature-badge.income {
  background: #d4edda;
  color: #155724;
}

.nature-badge.expense {
  background: #f8d7da;
  color: #721c24;
}

.nature-badge.unknown {
  background: #fff3cd;
  color: #856404;
}
</style>
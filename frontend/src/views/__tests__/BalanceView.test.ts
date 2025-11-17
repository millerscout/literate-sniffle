import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BalanceView from '../BalanceView.vue'

describe('BalanceView', () => {
  let mockFetch: any

  const mockStores = [
    {
      id: '1',
      ownerName: 'João Silva',
      name: 'Loja do João',
      transactionCount: 5,
      totalValue: 150.50
    },
    {
      id: '2',
      ownerName: 'Maria Santos',
      name: 'Mercado da Maria',
      transactionCount: 3,
      totalValue: -75.25
    }
  ]

  const mockTransactions = [
    {
      id: '1',
      transactionType: 'Débito',
      transactionCode: 1,
      nature: 'Income',
      sign: '+',
      date: '2023-01-01',
      formattedDate: '01/01/2023',
      value: 100.00,
      formattedValue: 'R$ 100,00',
      cpf: '12345678901',
      card: '1234567890123456',
      time: '08:30:00',
      formattedTime: '08:30',
      storeName: 'Loja do João',
      storeOwner: 'João Silva',
      storeId: '1',
      fileId: 'file1'
    },
    {
      id: '2',
      transactionType: 'Boleto',
      transactionCode: 2,
      nature: 'Expense',
      sign: '-',
      date: '2023-01-02',
      formattedDate: '02/01/2023',
      value: 50.50,
      formattedValue: 'R$ 50,50',
      cpf: '12345678901',
      card: '1234567890123456',
      time: '14:20:00',
      formattedTime: '14:20',
      storeName: 'Loja do João',
      storeOwner: 'João Silva',
      storeId: '1',
      fileId: 'file1'
    }
  ]

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders balance section correctly', () => {
    const wrapper = mount(BalanceView)

    expect(wrapper.text()).toContain('Store Balances')
    expect(wrapper.find('.refresh-btn').exists()).toBe(true)
  })

  it('fetches store balances on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stores: mockStores }),
    })

    const wrapper = mount(BalanceView)

    // Wait for the fetch to complete and component to update
    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    expect(mockFetch).toHaveBeenCalledWith('/api/stores/summary')
    expect(wrapper.vm.stores).toEqual(mockStores)
  })

  it('shows loading state initially', async () => {
    let resolvePromise: (value: any) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    mockFetch.mockReturnValueOnce(promise)

    const wrapper = mount(BalanceView)

    // Component starts with loading = true, but fetch is called immediately on mount
    // So we need to check that loading becomes true after mount
    expect(wrapper.vm.isLoading).toBe(true)

    // Resolve the promise
    resolvePromise({
      ok: true,
      json: async () => ({ stores: [] }),
    })

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.isLoading).toBe(false)
  })

  it('displays stores in table format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stores: mockStores }),
    })

    const wrapper = mount(BalanceView)

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('João Silva')
    expect(wrapper.text()).toContain('Loja do João')
    expect(wrapper.text()).toContain('Maria Santos')
    expect(wrapper.text()).toContain('Mercado da Maria')
  })

  it('formats currency correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stores: mockStores }),
    })

    const wrapper = mount(BalanceView)

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    // Check for currency formatting (Intl.NumberFormat adds non-breaking space)
    expect(wrapper.text()).toMatch(/R\$\s*150,50/)
    expect(wrapper.text()).toMatch(/-R\$\s*75,25/)
  })

  it('applies correct colors for positive and negative balances', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stores: mockStores }),
    })

    const wrapper = mount(BalanceView)

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    const positiveBalance = wrapper.find('.balance-amount.positive')
    const negativeBalance = wrapper.find('.balance-amount.negative')

    expect(positiveBalance.exists()).toBe(true)
    expect(negativeBalance.exists()).toBe(true)
  })

  it('shows error message when API fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
    })

    const wrapper = mount(BalanceView)

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Failed to fetch store balances')
  })

  it('shows empty state when no stores', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stores: [] }),
    })

    const wrapper = mount(BalanceView)

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('No stores found. Upload some CNAB files to see balances.')
  })

  it('toggles transaction details when clicking show details', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stores: mockStores }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: mockTransactions }),
      })

    const wrapper = mount(BalanceView)

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    const detailsBtn = wrapper.find('.details-btn')
    await detailsBtn.trigger('click')

    expect(mockFetch).toHaveBeenCalledWith('/api/transactions/store/1')
    expect(wrapper.vm.selectedStoreId).toBe('1')
  })

  it('displays transaction details when expanded', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stores: mockStores }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: mockTransactions }),
      })

    const wrapper = mount(BalanceView)

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    const detailsBtn = wrapper.find('.details-btn')
    await detailsBtn.trigger('click')

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Transaction Details')
    expect(wrapper.text()).toContain('Débito')
    expect(wrapper.text()).toContain('Boleto')
    expect(wrapper.text()).toContain('12345678901')
  })

  it('shows loading state for transaction details', async () => {
    let resolvePromise: (value: any) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stores: mockStores }),
      })
      .mockReturnValueOnce(promise)

    const wrapper = mount(BalanceView)

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    const detailsBtn = wrapper.find('.details-btn')
    await detailsBtn.trigger('click')

    // Check that loading state is set
    expect(wrapper.vm.isLoadingDetails).toBe(true)

    resolvePromise({
      ok: true,
      json: async () => ({ transactions: [] }),
    })

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.isLoadingDetails).toBe(false)
  })

  it('collapses details when clicking hide details', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stores: mockStores }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: mockTransactions }),
      })

    const wrapper = mount(BalanceView)

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    const detailsBtn = wrapper.find('.details-btn')
    await detailsBtn.trigger('click')

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.selectedStoreId).toBe('1')
    expect(wrapper.text()).toContain('Transaction Details')

    // Click again to collapse
    await detailsBtn.trigger('click')

    expect(wrapper.vm.selectedStoreId).toBe(null)
    expect(wrapper.text()).not.toContain('Transaction Details')
  })

  it('shows no transactions message when store has no transactions', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stores: mockStores }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [] }),
      })

    const wrapper = mount(BalanceView)

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    const detailsBtn = wrapper.find('.details-btn')
    await detailsBtn.trigger('click')

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('No transactions found for this store.')
  })

  it('applies correct styling to transaction rows based on nature', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stores: mockStores }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: mockTransactions }),
      })

    const wrapper = mount(BalanceView)

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    const detailsBtn = wrapper.find('.details-btn')
    await detailsBtn.trigger('click')

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    const incomeRow = wrapper.find('.transaction-row.income')
    const expenseRow = wrapper.find('.transaction-row.expense')

    expect(incomeRow.exists()).toBe(true)
    expect(expenseRow.exists()).toBe(true)
  })

  it('formats transaction values with correct signs and colors', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stores: mockStores }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: mockTransactions }),
      })

    const wrapper = mount(BalanceView)

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    const detailsBtn = wrapper.find('.details-btn')
    await detailsBtn.trigger('click')

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    // Check for transaction values with signs (sign comes before currency)
    expect(wrapper.text()).toMatch(/\+R\$\s*100,00/)
    expect(wrapper.text()).toMatch(/-R\$\s*50,50/)
  })

  it('refreshes data when refresh button is clicked', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ stores: mockStores }),
    })

    const wrapper = mount(BalanceView)

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    // Click refresh button
    const refreshBtn = wrapper.find('.refresh-btn')
    await refreshBtn.trigger('click')

    // Should call fetch twice (once on mount, once on click)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('disables refresh button during loading', async () => {
    // Start with a pending promise to simulate loading state
    let resolvePromise: (value: any) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    mockFetch.mockReturnValueOnce(promise)

    const wrapper = mount(BalanceView)

    // Wait for DOM to update after mount
    await wrapper.vm.$nextTick()

    // Button should be disabled while loading
    const refreshBtn = wrapper.find('.refresh-btn')
    expect(wrapper.vm.isLoading).toBe(true)
    expect(refreshBtn.attributes('disabled')).toBeDefined()

    resolvePromise({
      ok: true,
      json: async () => ({ stores: [] }),
    })

    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.isLoading).toBe(false)
    expect(refreshBtn.attributes('disabled')).toBeUndefined()
  })
})
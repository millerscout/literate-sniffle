import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import UserList from '../UserList.vue'

describe('UserList', () => {
  const mockUsers = [
    {
      id: 1,
      email: 'john@example.com',
      name: 'John Doe',
      createdAt: '2023-01-01T00:00:00.000Z',
    },
    {
      id: 2,
      email: 'jane@example.com',
      name: 'Jane Smith',
      createdAt: '2023-01-02T00:00:00.000Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders user list correctly', async () => {
    // Mock successful API response
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockUsers),
      } as Response)
    )

    const wrapper = mount(UserList)

    // Wait for component to mount and fetch data
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Users')
    expect(wrapper.text()).toContain('John Doe')
    expect(wrapper.text()).toContain('Jane Smith')
  })

  it('shows loading state initially', async () => {
    // Mock delayed response
    let resolvePromise: (value: any) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    global.fetch = vi.fn(() => promise)

    const wrapper = mount(UserList)

    expect(wrapper.text()).toContain('Loading...')

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: () => Promise.resolve([]),
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('Loading...')
  })

  it('shows error message when API fails', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
      } as Response)
    )

    const wrapper = mount(UserList)

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Error: Failed to fetch users')
  })

  it('shows empty state when no users', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response)
    )

    const wrapper = mount(UserList)

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('No users found.')
  })

  it('refreshes data when refresh button is clicked', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockUsers),
      } as Response)
    )

    const wrapper = mount(UserList)

    await wrapper.vm.$nextTick()

    // Click refresh button
    await wrapper.find('.refresh-btn').trigger('click')

    // Should call fetch twice (once on mount, once on click)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})
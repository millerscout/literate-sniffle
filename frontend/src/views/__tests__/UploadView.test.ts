import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import UploadView from '../UploadView.vue'

describe('UploadView', () => {
  let mockFetch: any

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })
    // Clear localStorage
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders upload section correctly', () => {
    const wrapper = mount(UploadView)

    expect(wrapper.text()).toContain('File Upload')
    expect(wrapper.find('.file-input').exists()).toBe(true)
    expect(wrapper.find('.upload-btn').exists()).toBe(true)
  })

  it('disables upload button when no file selected', () => {
    const wrapper = mount(UploadView)

    const uploadBtn = wrapper.find('.upload-btn')
    expect(uploadBtn.attributes('disabled')).toBeDefined()
  })

  it('enables upload button when file is selected', async () => {
    const wrapper = mount(UploadView)

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    const fileInput = wrapper.find('.file-input')

    // Create a proper event with files
    const event = new Event('change', { bubbles: true })
    Object.defineProperty(event, 'target', {
      writable: false,
      value: {
        files: [file],
      },
    })

    await fileInput.element.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    const uploadBtn = wrapper.find('.upload-btn')
    expect(uploadBtn.attributes('disabled')).toBeUndefined()
  })

  it('displays file information when file is selected', async () => {
    const wrapper = mount(UploadView)

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    const fileInput = wrapper.find('.file-input')

    const event = new Event('change', { bubbles: true })
    Object.defineProperty(event, 'target', {
      writable: false,
      value: {
        files: [file],
      },
    })

    await fileInput.element.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Selected: test.txt')
  })

  it('shows loading state during upload', async () => {
    const wrapper = mount(UploadView)

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    
    // Set up the file
    const fileInput = wrapper.find('.file-input')
    const event = new Event('change', { bubbles: true })
    Object.defineProperty(event, 'target', {
      writable: false,
      value: {
        files: [file],
      },
    })

    await fileInput.element.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    // Mock pending fetch
    mockFetch.mockImplementation(() => new Promise(() => {}))

    // Trigger upload
    const uploadBtn = wrapper.find('.upload-btn')
    await uploadBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.upload-btn').text()).toContain('Uploading...')
    expect(wrapper.find('.progress-container').exists()).toBe(true)
  })

  it('displays success message on successful upload', async () => {
    const wrapper = mount(UploadView)

    const file = new File(['test content'], 'test.cnab', { type: 'text/plain' })
    
    const fileInput = wrapper.find('.file-input')
    const event = new Event('change', { bubbles: true })
    Object.defineProperty(event, 'target', {
      writable: false,
      value: {
        files: [file],
      },
    })

    await fileInput.element.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    // Mock successful chunk upload
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    // Mock successful completion
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ format: 'CNAB240' }),
    })

    const uploadBtn = wrapper.find('.upload-btn')
    await uploadBtn.trigger('click')
    
    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('successfully')
  })

  it('displays error message on validation failure', async () => {
    const wrapper = mount(UploadView)

    const file = new File(['test content'], 'test.cnab', { type: 'text/plain' })
    
    const fileInput = wrapper.find('.file-input')
    const event = new Event('change', { bubbles: true })
    Object.defineProperty(event, 'target', {
      writable: false,
      value: {
        files: [file],
      },
    })

    await fileInput.element.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    // Mock successful chunk upload
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    // Mock validation failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'Validation failed',
        details: 'Invalid record length: 81. Expected 80 characters for this CNAB format.',
      }),
    })

    const uploadBtn = wrapper.find('.upload-btn')
    await uploadBtn.trigger('click')
    
    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('CNAB validation failed')
    expect(wrapper.text()).toContain('Invalid record length')
  })

  it('applies error styling to validation errors', async () => {
    const wrapper = mount(UploadView)

    const file = new File(['test content'], 'test.cnab', { type: 'text/plain' })
    
    const fileInput = wrapper.find('.file-input')
    const event = new Event('change', { bubbles: true })
    Object.defineProperty(event, 'target', {
      writable: false,
      value: {
        files: [file],
      },
    })

    await fileInput.element.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    // Mock successful chunk upload
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    // Mock validation failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'Validation failed',
        details: 'Invalid record length',
      }),
    })

    const uploadBtn = wrapper.find('.upload-btn')
    await uploadBtn.trigger('click')
    
    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    const statusDiv = wrapper.find('.status')
    expect(statusDiv.classes()).toContain('status-error')
  })

  it('applies success styling to successful uploads', async () => {
    const wrapper = mount(UploadView)

    const file = new File(['test content'], 'test.cnab', { type: 'text/plain' })
    
    const fileInput = wrapper.find('.file-input')
    const event = new Event('change', { bubbles: true })
    Object.defineProperty(event, 'target', {
      writable: false,
      value: {
        files: [file],
      },
    })

    await fileInput.element.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    // Mock successful chunk upload
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    // Mock successful completion
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ format: 'CNAB240' }),
    })

    const uploadBtn = wrapper.find('.upload-btn')
    await uploadBtn.trigger('click')
    
    await new Promise((resolve) => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    const statusDiv = wrapper.find('.status')
    expect(statusDiv.classes()).toContain('status-success')
  })
})

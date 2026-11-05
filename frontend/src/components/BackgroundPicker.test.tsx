import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, NavLink, Route, Routes } from 'react-router-dom'
import { I18nProvider } from '../i18n'
import { BACKGROUND_STORAGE_KEY } from '../lib/backgrounds'
import { Layout } from './Layout'

vi.mock('./PwaUpdatePrompt', () => ({ PwaUpdatePrompt: () => null }))

function openApp() {
  return render(<I18nProvider><MemoryRouter><Layout><NavLink to="/help">Open help page</NavLink><Routes><Route path="/" element={<p>Send page</p>} /><Route path="/help" element={<p>Help page</p>} /></Routes></Layout></MemoryRouter></I18nProvider>)
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('en-US')
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.removeAttribute('open') } })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.documentElement.classList.remove('dark') })

describe('app background chooser', () => {
  it('keeps the original photo, opens four named options, and focuses Close', async () => {
    const { container } = openApp()
    expect(container.querySelector('.app-shell')).toHaveAttribute('data-background', 'dusk')
    await userEvent.click(screen.getByRole('button', { name: 'Change background' }))
    const dialog = screen.getByRole('dialog', { name: 'Choose your backdrop' })
    expect(within(dialog).getAllByRole('radio')).toHaveLength(4)
    expect(within(dialog).getByRole('radio', { name: 'Original sunset' })).toBeChecked()
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus()
    expect(dialog).toHaveAccessibleDescription(/Select a scene to preview/)
  })

  it('previews immediately, persists across navigation and remount, and restores the original', async () => {
    const first = openApp()
    await userEvent.click(screen.getByRole('button', { name: 'Change background' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Alpine mist' }))
    expect(first.container.querySelector('.app-shell')).toHaveAttribute('data-background', 'alpine')
    expect(first.container.querySelector('.app-shell')).toHaveStyle({ '--app-wallpaper': 'url("/backgrounds/alpine.webp")' })
    expect(localStorage.getItem(BACKGROUND_STORAGE_KEY)).toBe('alpine')
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    await userEvent.click(screen.getByRole('link', { name: 'Open help page' }))
    expect(screen.getByText('Help page')).toBeInTheDocument()
    expect(first.container.querySelector('.app-shell')).toHaveAttribute('data-background', 'alpine')
    first.unmount()
    const second = openApp()
    expect(second.container.querySelector('.app-shell')).toHaveAttribute('data-background', 'alpine')
    await userEvent.click(screen.getByRole('button', { name: 'Change background' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Original sunset' }))
    expect(second.container.querySelector('.app-shell')).toHaveStyle({ '--app-wallpaper': 'url("/hero-dusk.webp")' })
  })

  it('supports keyboard selection and Escape, keeping the previewed selection', async () => {
    openApp()
    await userEvent.click(screen.getByRole('button', { name: 'Change background' }))
    await userEvent.tab()
    expect(screen.getByRole('radio', { name: 'Original sunset' })).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Alpine mist' })).toBeChecked()
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(localStorage.getItem(BACKGROUND_STORAGE_KEY)).toBe('alpine')
  })

  it('uses the selection in dark mode without replacing the theme', async () => {
    localStorage.setItem('scansend-theme', 'dark')
    const { container } = openApp()
    await userEvent.click(screen.getByRole('button', { name: 'Change background' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Pearl glass' }))
    expect(document.documentElement).toHaveClass('dark')
    expect(container.querySelector('.app-shell')).toHaveAttribute('data-background', 'pearl')
    expect(localStorage.getItem('scansend-theme')).toBe('dark')
  })

  it('keeps the app usable without storage and explains the session-only selection', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    const { container } = openApp()
    await userEvent.click(screen.getByRole('button', { name: 'Change background' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Lavender coast' }))
    expect(container.querySelector('.app-shell')).toHaveAttribute('data-background', 'coast')
    expect(screen.getByRole('status')).toHaveTextContent('Browser storage is unavailable.')
  })

  it('renders Japanese labels', async () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('ja-JP')
    openApp()
    await userEvent.click(screen.getByRole('button', { name: '背景を変更' }))
    expect(screen.getByRole('dialog', { name: '背景を選ぶ' })).toBeVisible()
    expect(screen.getByRole('radio', { name: '元の夕景' })).toBeChecked()
    expect(screen.getByRole('button', { name: '完了' })).toBeVisible()
  })
})

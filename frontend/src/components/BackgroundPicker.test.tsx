import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, NavLink, Route, Routes } from 'react-router-dom'
import { I18nProvider } from '../i18n'
import { BACKGROUND_STORAGE_KEY } from '../lib/backgrounds'
import { NEON_SETTINGS_STORAGE_KEY, readNeonSettings } from '../lib/neonWallpaper'
import { Layout } from './Layout'

vi.mock('./PwaUpdatePrompt', () => ({ PwaUpdatePrompt: () => null }))

function openApp() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <Layout>
          <NavLink to="/help">Open help page</NavLink>
          <Routes>
            <Route path="/" element={<p>Send page</p>} />
            <Route path="/help" element={<p>Help page</p>} />
          </Routes>
        </Layout>
      </MemoryRouter>
    </I18nProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('en-US')
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value() {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value() {
      this.removeAttribute('open')
    },
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  document.documentElement.classList.remove('dark')
})

describe('app background chooser', () => {
  it('defaults to live neon, opens nine named options, and focuses Close', async () => {
    const { container } = openApp()
    expect(container.querySelector('.app-shell')).toHaveAttribute('data-background', 'neon')
    expect(screen.getByTestId('neon-wallpaper')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Change background' }))
    const dialog = screen.getByRole('dialog', { name: 'Choose your backdrop' })
    expect(within(dialog).getAllByRole('radio')).toHaveLength(9)
    expect(within(dialog).getByRole('radio', { name: /Live neon/ })).toBeChecked()
    for (const label of ['Original sunset', 'Obsidian silk', 'Emerald crystal', 'Champagne wave', 'Pearl mint silk']) {
      expect(within(dialog).getByRole('radio', { name: label })).toBeInTheDocument()
    }
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus()
    expect(dialog).toHaveAccessibleDescription(/Select a scene to preview/)
  })

  it('previews immediately, hides neon wallpaper for static photos, persists across navigation and remount, and restores live neon', async () => {
    const first = openApp()
    expect(screen.getByTestId('neon-wallpaper')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Change background' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Alpine mist' }))
    expect(first.container.querySelector('.app-shell')).toHaveAttribute('data-background', 'alpine')
    expect(first.container.querySelector('.app-shell')).toHaveAttribute('data-neon-mode', 'off')
    expect(first.container.querySelector('.app-shell')).toHaveStyle({ '--app-wallpaper': 'url("/backgrounds/alpine.webp")' })
    expect(screen.queryByTestId('neon-wallpaper')).not.toBeInTheDocument()
    expect(localStorage.getItem(BACKGROUND_STORAGE_KEY)).toBe('alpine')

    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    await userEvent.click(screen.getByRole('link', { name: 'Open help page' }))
    expect(screen.getByText('Help page')).toBeInTheDocument()
    expect(first.container.querySelector('.app-shell')).toHaveAttribute('data-background', 'alpine')

    first.unmount()
    const second = openApp()
    expect(second.container.querySelector('.app-shell')).toHaveAttribute('data-background', 'alpine')
    expect(screen.queryByTestId('neon-wallpaper')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Change background' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Original sunset' }))
    expect(second.container.querySelector('.app-shell')).toHaveStyle({ '--app-wallpaper': 'url("/hero-dusk.webp")' })

    await userEvent.click(screen.getByRole('radio', { name: /Live neon/ }))
    expect(second.container.querySelector('.app-shell')).toHaveAttribute('data-background', 'neon')
    expect(screen.getByTestId('neon-wallpaper')).toBeInTheDocument()
  })

  it('supports keyboard selection and Escape, keeping the previewed selection', async () => {
    openApp()
    await userEvent.click(screen.getByRole('button', { name: 'Change background' }))
    await userEvent.tab()
    expect(screen.getByRole('radio', { name: /Live neon/ })).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Original sunset' })).toBeChecked()
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(localStorage.getItem(BACKGROUND_STORAGE_KEY)).toBe('dusk')
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

  it('renders Japanese labels with live neon checked by default and switches to a luxury photo option', async () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('ja-JP')
    const { container } = openApp()
    expect(screen.getByTestId('neon-wallpaper')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '背景を変更' }))
    expect(screen.getByRole('dialog', { name: '背景を選ぶ' })).toBeVisible()
    expect(screen.getByRole('radio', { name: /ライブネオン/ })).toBeChecked()

    await userEvent.click(screen.getByRole('radio', { name: 'オブシディアン・シルク' }))
    expect(screen.getByRole('radio', { name: 'オブシディアン・シルク' })).toBeChecked()
    expect(container.querySelector('.app-shell')).toHaveAttribute('data-background', 'obsidian')
    expect(container.querySelector('.app-shell')).toHaveStyle({ '--app-wallpaper': 'url("/backgrounds/obsidian.webp")' })
    expect(screen.queryByTestId('neon-wallpaper')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '完了' })).toBeVisible()
  })

  it('defaults to Neon Prisms with Cyberpunk Neon and Dot Matrix, and persists Neon Studio Controls', async () => {
    const first = openApp()
    const shell = first.container.querySelector('.app-shell')
    const wallpaper = screen.getByTestId('neon-wallpaper')
    expect(shell).toHaveAttribute('data-neon-mode', 'prisms')
    expect(shell).toHaveAttribute('data-neon-palette', 'cyberpunk')
    expect(wallpaper).toHaveAttribute('data-light-mode', 'prisms')
    expect(wallpaper).toHaveAttribute('data-palette', 'cyberpunk')
    expect(wallpaper).toHaveAttribute('data-texture', 'dots')
    expect(screen.getByTestId('neon-texture-overlay')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Change background' }))
    const dialog = screen.getByRole('dialog', { name: 'Choose your backdrop' })

    const lightGroup = within(dialog).getByRole('group', { name: 'Light style' })
    expect(within(lightGroup).getAllByRole('button')).toHaveLength(10)
    expect(within(lightGroup).getByRole('button', { name: 'Neon Prisms' })).toHaveAttribute('aria-pressed', 'true')

    const paletteGroup = within(dialog).getByRole('group', { name: 'Color palette' })
    expect(within(paletteGroup).getAllByRole('button')).toHaveLength(7)
    expect(within(paletteGroup).getByRole('button', { name: 'Select Cyberpunk Neon palette' })).toHaveAttribute('aria-pressed', 'true')

    const textureGroup = within(dialog).getByRole('group', { name: 'Surface texture' })
    expect(within(textureGroup).getAllByRole('button')).toHaveLength(4)
    expect(within(textureGroup).getByRole('button', { name: 'Dot Matrix' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(within(lightGroup).getByRole('button', { name: 'Laser Lines' }))
    expect(shell).toHaveAttribute('data-neon-mode', 'lasers')

    await userEvent.click(within(lightGroup).getByRole('button', { name: 'Aurora' }))
    expect(shell).toHaveAttribute('data-neon-mode', 'aurora')

    await userEvent.click(within(paletteGroup).getByRole('button', { name: 'Select Electric Glow palette' }))
    expect(shell).toHaveAttribute('data-neon-palette', 'electric')

    await userEvent.click(within(textureGroup).getByRole('button', { name: 'Clean OLED' }))
    expect(screen.queryByTestId('neon-texture-overlay')).not.toBeInTheDocument()

    await userEvent.click(within(textureGroup).getByRole('button', { name: 'Scanlines' }))
    expect(screen.getByTestId('neon-wallpaper')).toHaveAttribute('data-texture', 'scanlines')
    expect(screen.getByTestId('neon-texture-overlay')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Pause' }))
    expect(within(dialog).getByRole('button', { name: 'Play' })).toBeInTheDocument()

    fireEvent.change(within(dialog).getByRole('slider', { name: 'Drift Speed' }), { target: { value: '1.35' } })
    fireEvent.change(within(dialog).getByRole('slider', { name: 'Glow Intensity' }), { target: { value: '0.6' } })
    fireEvent.change(within(dialog).getByRole('slider', { name: 'Light Softness (Blur)' }), { target: { value: '125' } })

    const expected = {
      lightMode: 'aurora',
      paletteId: 'electric',
      textureMode: 'scanlines',
      isPlaying: false,
      speed: 1.35,
      intensity: 0.6,
      blurLevel: 125,
    }
    expect(JSON.parse(localStorage.getItem(NEON_SETTINGS_STORAGE_KEY) ?? '{}')).toEqual(expected)
    expect(readNeonSettings()).toEqual(expected)

    first.unmount()
    const second = openApp()
    const remountedShell = second.container.querySelector('.app-shell')
    expect(remountedShell).toHaveAttribute('data-background', 'neon')
    expect(remountedShell).toHaveAttribute('data-neon-mode', 'aurora')
    expect(remountedShell).toHaveAttribute('data-neon-palette', 'electric')
    expect(screen.getByTestId('neon-wallpaper')).toHaveAttribute('data-texture', 'scanlines')

    // Switching to a static photo disables the neon wallpaper and hides Neon Studio Controls.
    await userEvent.click(screen.getByRole('button', { name: 'Change background' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Obsidian silk' }))
    expect(remountedShell).toHaveAttribute('data-background', 'obsidian')
    expect(remountedShell).toHaveAttribute('data-neon-mode', 'off')
    expect(screen.queryByTestId('neon-wallpaper')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Light style' })).not.toBeInTheDocument()
  })
})

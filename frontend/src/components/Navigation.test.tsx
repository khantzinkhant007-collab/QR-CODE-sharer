import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { I18nProvider } from '../i18n'
import { Layout } from './Layout'

vi.mock('./PwaUpdatePrompt', () => ({ PwaUpdatePrompt: () => null }))

it('keeps both navigation bars mounted and switches pages without a browser snapshot', async () => {
  const original = Object.getOwnPropertyDescriptor(document, 'startViewTransition')
  const startViewTransition = vi.fn((update: () => void | Promise<void>) => {
    const done = Promise.resolve().then(update)
    return { ready: done, updateCallbackDone: done, finished: done, skipTransition: vi.fn() }
  })
  Object.defineProperty(document, 'startViewTransition', { configurable: true, value: startViewTransition })
  const language = vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
  const router = createMemoryRouter([{
    element: <Layout><Outlet /></Layout>,
    children: [
      { path: '/', element: <h1>Send page</h1> },
      { path: '/help', element: <h1>Help page</h1> },
      { path: '/qr', element: <h1>Text QR page</h1> },
    ],
  }])

  try {
    const user = userEvent.setup()
    render(<I18nProvider><RouterProvider router={router} /></I18nProvider>)
    const header = screen.getByRole('banner')
    const [desktop, mobile] = screen.getAllByRole('navigation')

    await user.click(within(desktop).getByRole('link', { name: 'Help' }))
    expect(await screen.findByRole('heading', { name: 'Help page' })).toBeVisible()
    expect(within(mobile).getByRole('link', { name: 'Help' })).toHaveAttribute('aria-current', 'page')

    const mobileQr = within(mobile).getByRole('link', { name: 'Text QR' })
    mobileQr.focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { name: 'Text QR page' })).toBeVisible()
    expect(within(desktop).getByRole('link', { name: 'Text QR' })).toHaveAttribute('aria-current', 'page')
    expect(mobileQr).toHaveFocus()

    await user.click(within(header).getByRole('link', { name: /ScanSend/ }))
    expect(await screen.findByRole('heading', { name: 'Send page' })).toBeVisible()
    expect(screen.getByRole('banner')).toBe(header)
    expect(screen.getAllByRole('navigation')[0]).toBe(desktop)
    expect(screen.getAllByRole('navigation')[1]).toBe(mobile)
    expect(startViewTransition).not.toHaveBeenCalled()
  } finally {
    cleanup()
    router.dispose()
    language.mockRestore()
    document.documentElement.classList.remove('dark')
    localStorage.clear()
    if (original) Object.defineProperty(document, 'startViewTransition', original)
    else Reflect.deleteProperty(document, 'startViewTransition')
  }
})

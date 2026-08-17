import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../i18n'
import { CameraCapture } from './CameraCapture'

afterEach(() => vi.restoreAllMocks())

describe('CameraCapture fallback', () => {
  it('uses a capture file input when getUserMedia is unavailable', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
    const onSelect = vi.fn()
    render(<I18nProvider><CameraCapture open onSelect={onSelect} onClose={vi.fn()} /></I18nProvider>)

    const picker = await screen.findByLabelText(/camera picker/i)
    expect(picker).toHaveAttribute('capture', 'environment')
    const photo = new File(['photo'], 'camera.jpg', { type: 'image/jpeg' })
    fireEvent.change(picker, { target: { files: [photo] } })
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(photo))
  })
})


import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../i18n'
import { FilePreview } from './FilePreview'

describe('FilePreview', () => {
  it('renders an image preview and metadata', () => {
    render(<I18nProvider><FilePreview file={new File(['abc'], 'photo.jpg', { type: 'image/jpeg' })} url="blob:image" onRemove={vi.fn()} onChange={vi.fn()} /></I18nProvider>)
    expect(screen.getByAltText('Selected file preview')).toHaveAttribute('src', 'blob:image')
    expect(screen.getAllByText('photo.jpg').length).toBeGreaterThan(0)
    expect(screen.getByText('image/jpeg')).toBeInTheDocument()
  })

  it('uses metadata-only loading for a video preview', () => {
    render(<I18nProvider><FilePreview file={new File(['abc'], 'clip.mov', { type: 'video/quicktime' })} url="blob:video" onRemove={vi.fn()} onChange={vi.fn()} /></I18nProvider>)
    expect(screen.getByLabelText('Selected video preview')).toHaveAttribute('preload', 'metadata')
  })
})


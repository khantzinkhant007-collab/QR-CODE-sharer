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

  it('shows an attachment card without embedding or executing a document', () => {
    const { container } = render(<I18nProvider><FilePreview file={new File(['pdf'], 'handout.pdf', { type: 'application/pdf' })} url="blob:pdf" onRemove={vi.fn()} onChange={vi.fn()} /></I18nProvider>)
    expect(screen.getByText(/Attachment ready to share/)).toBeVisible()
    expect(screen.getAllByText('handout.pdf').length).toBeGreaterThan(0)
    expect(container.querySelector('iframe, object, embed, img, video')).toBeNull()
  })

  it('renders a multi-file bundle summary and supports removing individual files', () => {
    const onRemoveFile = vi.fn()
    const files = [
      new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }),
      new File(['pdf'], 'handout.pdf', { type: 'application/pdf' }),
    ]
    render(
      <I18nProvider>
        <FilePreview
          file={files[0]}
          files={files}
          url="blob:image"
          onRemove={vi.fn()}
          onChange={vi.fn()}
          onAddFiles={vi.fn()}
          onRemoveFile={onRemoveFile}
        />
      </I18nProvider>,
    )
    expect(screen.getByText('2 files selected')).toBeVisible()
    expect(screen.getAllByText('scansend-2-files.zip').length).toBeGreaterThan(0)
    expect(screen.getByText('photo.jpg')).toBeVisible()
    expect(screen.getByText('handout.pdf')).toBeVisible()
    screen.getByRole('button', { name: 'Remove handout.pdf' }).click()
    expect(onRemoveFile).toHaveBeenCalledWith(1)
  })
})


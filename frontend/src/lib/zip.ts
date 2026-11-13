const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let crc = i
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    }
    table[i] = crc >>> 0
  }
  return table
})()

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

export function sanitizeArchiveEntryName(rawName: string, usedNames: Set<string>): string {
  const cleaned = rawName
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.replace(/[\p{Cc}<>:"|?*]/gu, '_')
    .trim() || 'file'

  if (!usedNames.has(cleaned.toLowerCase())) {
    usedNames.add(cleaned.toLowerCase())
    return cleaned
  }

  const dotIndex = cleaned.lastIndexOf('.')
  const stem = dotIndex > 0 ? cleaned.slice(0, dotIndex) : cleaned
  const ext = dotIndex > 0 ? cleaned.slice(dotIndex) : ''
  let counter = 2
  while (usedNames.has(`${stem} (${counter})${ext}`.toLowerCase())) {
    counter++
  }
  const candidate = `${stem} (${counter})${ext}`
  usedNames.add(candidate.toLowerCase())
  return candidate
}

function dosDateTime(date: Date): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, Math.min(2107, date.getFullYear()))
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = Math.floor(date.getSeconds() / 2)

  return {
    dosTime: (hours << 11) | (minutes << 5) | seconds,
    dosDate: ((year - 1980) << 9) | (month << 5) | day,
  }
}

async function readFileBytes(file: Blob): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === 'function') {
    return new Uint8Array(await file.arrayBuffer())
  }
  return new Uint8Array(await new Response(file).arrayBuffer())
}

export async function bundleFilesAsZip(
  files: File[],
  archiveName = `scansend-${files.length}-files.zip`,
): Promise<File> {
  const encoder = new TextEncoder()
  const usedNames = new Set<string>()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let localOffset = 0

  for (const file of files) {
    const data = await readFileBytes(file)
    const entryName = sanitizeArchiveEntryName(file.name, usedNames)
    const nameBytes = encoder.encode(entryName)
    const checksum = crc32(data)
    const modified = new Date(file.lastModified || Date.now())
    const { dosTime, dosDate } = dosDateTime(modified)

    const localHeader = new Uint8Array(30 + nameBytes.length)
    const localView = new DataView(localHeader.buffer)
    localView.setUint32(0, 0x04034b50, true) // Local file header signature
    localView.setUint16(4, 20, true) // Version needed to extract (2.0)
    localView.setUint16(6, 0x0800, true) // UTF-8 filename flag
    localView.setUint16(8, 0, true) // Compression method: STORE (0)
    localView.setUint16(10, dosTime, true)
    localView.setUint16(12, dosDate, true)
    localView.setUint32(14, checksum, true)
    localView.setUint32(18, data.byteLength, true)
    localView.setUint32(22, data.byteLength, true)
    localView.setUint16(26, nameBytes.length, true)
    localView.setUint16(28, 0, true) // Extra field length
    localHeader.set(nameBytes, 30)

    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const centralView = new DataView(centralHeader.buffer)
    centralView.setUint32(0, 0x02014b50, true) // Central directory header signature
    centralView.setUint16(4, 20, true) // Version made by
    centralView.setUint16(6, 20, true) // Version needed to extract
    centralView.setUint16(8, 0x0800, true) // UTF-8 filename flag
    centralView.setUint16(10, 0, true) // Compression method: STORE (0)
    centralView.setUint16(12, dosTime, true)
    centralView.setUint16(14, dosDate, true)
    centralView.setUint32(16, checksum, true)
    centralView.setUint32(20, data.byteLength, true)
    centralView.setUint32(24, data.byteLength, true)
    centralView.setUint16(28, nameBytes.length, true)
    centralView.setUint16(30, 0, true) // Extra field length
    centralView.setUint16(32, 0, true) // File comment length
    centralView.setUint16(34, 0, true) // Disk number start
    centralView.setUint16(36, 0, true) // Internal file attributes
    centralView.setUint32(38, 0, true) // External file attributes
    centralView.setUint32(42, localOffset, true) // Relative offset of local header
    centralHeader.set(nameBytes, 46)

    localParts.push(localHeader, data)
    centralParts.push(centralHeader)
    localOffset += localHeader.byteLength + data.byteLength
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.byteLength, 0)
  const endRecord = new Uint8Array(22)
  const endView = new DataView(endRecord.buffer)
  endView.setUint32(0, 0x06054b50, true) // End of central directory signature
  endView.setUint16(4, 0, true) // Number of this disk
  endView.setUint16(6, 0, true) // Disk where central directory starts
  endView.setUint16(8, files.length, true) // Total entries on this disk
  endView.setUint16(10, files.length, true) // Total entries in central directory
  endView.setUint32(12, centralSize, true) // Size of central directory
  endView.setUint32(16, localOffset, true) // Offset of start of central directory
  endView.setUint16(20, 0, true) // Comment length

  const totalLength = localOffset + centralSize + endRecord.byteLength
  const archiveBuffer = new ArrayBuffer(totalLength)
  const archiveBytes = new Uint8Array(archiveBuffer)
  let writeOffset = 0
  for (const part of [...localParts, ...centralParts, endRecord]) {
    archiveBytes.set(part, writeOffset)
    writeOffset += part.byteLength
  }

  return new File([archiveBuffer], archiveName, {
    type: 'application/zip',
  })
}

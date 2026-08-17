import sharp from 'sharp'

function iconSvg(size, maskable = false) {
  const inset = maskable ? 76 : 0
  const inner = size - inset * 2
  const scale = inner / 512
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#087f82"/>
    <g transform="translate(${inset} ${inset}) scale(${scale})">
      <rect width="512" height="512" rx="116" fill="#087f82"/>
      <circle cx="386" cy="126" r="92" fill="#22d3ee" opacity=".28"/>
      <g fill="none" stroke="#fff" stroke-width="34" stroke-linecap="round" stroke-linejoin="round">
        <path d="M128 218v-74a16 16 0 0 1 16-16h74M294 128h74a16 16 0 0 1 16 16v74M384 294v74a16 16 0 0 1-16 16h-74M218 384h-74a16 16 0 0 1-16-16v-74"/>
        <path d="M256 174v152M204 274l52 52 52-52"/>
      </g>
    </g>
  </svg>`
}

await Promise.all([
  sharp(Buffer.from(iconSvg(192))).png().toFile('public/pwa-192.png'),
  sharp(Buffer.from(iconSvg(512))).png().toFile('public/pwa-512.png'),
  sharp(Buffer.from(iconSvg(512, true))).png().toFile('public/pwa-maskable-512.png'),
])


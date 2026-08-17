import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseDocument } from 'yaml'

const files = [
  '../docs/openapi.yaml',
  '../.github/workflows/frontend.yml',
  '../.github/workflows/backend.yml',
  '../docker-compose.yml',
]

for (const file of files) {
  const absolutePath = resolve(file)
  const document = parseDocument(await readFile(absolutePath, 'utf8'))
  if (document.errors.length > 0) {
    throw new Error(`${file}: ${document.errors.map((error) => error.message).join('; ')}`)
  }
  console.log(`YAML OK: ${file}`)
}


import type { UserConfig } from 'tsdown'
import { globSync, readFileSync } from 'node:fs'
import { defineConfig } from 'tsdown'

const userScriptRegex = /\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/
const entryNameRegex = /src\/(.+)\.ts$/
const slashRegex = /\//g

function extractUserScriptHeader(filePath: string) {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const match = content.match(userScriptRegex)
    return match ? `${match[0]}\n` : ''
  }
  catch {
    return ''
  }
}

const entryFiles = globSync('src/**/*.ts')

function getEntryName(filePath: string): string {
  const match = filePath.match(entryNameRegex)
  return match ? match[1].replace(slashRegex, '_') : 'bundle'
}

export default defineConfig(
  entryFiles.map<UserConfig>(file => ({
    entry: [file],
    dts: false,
    format: 'iife',
    outputOptions: {
      codeSplitting: false,
      name: getEntryName(file),
      banner: chunk => extractUserScriptHeader(chunk.moduleIds[0]),
    },
    hooks: {
      'build:done': async (chunk) => {
        console.warn(`${JSON.stringify(chunk)}`)
      },
    },
  })),
)

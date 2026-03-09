import { globSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'

const versionRegex = /@version\s+(\d+)(?:\.(\d+))?(?:\.(\d+))?/

async function bumpVersions() {
  const files = globSync('src/**/*.ts')

  for (const file of files) {
    const content = await readFile(file, 'utf-8')

    // 匹配 @version x.x.x 或 x.x 格式
    const versionMatch = content.match(versionRegex)
    if (!versionMatch)
      continue

    const [, major, minor = '0', patch = '0'] = versionMatch
    const newPatch = Number(patch) + 1
    const newVersion = `${major}.${minor}.${newPatch}`

    const newContent = content.replace(
      versionRegex,
      `@version      ${newVersion}`,
    )

    await writeFile(file, newContent, 'utf-8')
    console.log(`[bump-version] ${file}: ${major}.${minor}.${patch} -> ${newVersion}`)
  }
}

bumpVersions().catch(console.error)

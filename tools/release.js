// /// <reference types="@types/node" />

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const MANIFEST_PATH = path.join(ROOT, 'staticCh', 'manifest.json')
const CHROMIUM_ZIP = path.join(ROOT, 'build', 'global-speed-chromium.zip')
const FIREFOX_ZIP = path.join(ROOT, 'buildFf', 'global-speed-firefox.zip')

function run(cmd, options = {}) {
  console.log(`> ${cmd}`)
  return execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...options })
}

function main() {
  // Read version from manifest
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'))
  const version = manifest.version
  const tag = `v${version}`

  console.log(`\nGlobal Speed v${version}`)

  // Build both versions
  console.log('\nBuilding Chromium version...')
  run('npm run build:prod')

  console.log('\nBuilding Firefox version...')
  run('npm run build:prodFf')

  // Verify zip files exist
  if (!fs.existsSync(CHROMIUM_ZIP)) {
    console.error(`Error: Chromium zip not found at ${CHROMIUM_ZIP}`)
    process.exit(1)
  }
  if (!fs.existsSync(FIREFOX_ZIP)) {
    console.error(`Error: Firefox zip not found at ${FIREFOX_ZIP}`)
    process.exit(1)
  }

  // Create GitHub release (automatically creates and pushes the tag)
  console.log('\nCreating GitHub release...')
  run(`gh release create ${tag} "${CHROMIUM_ZIP}" "${FIREFOX_ZIP}" --title "Global Speed v${version}"`)

  console.log(`\nRelease ${tag} created successfully!`)
  console.log(`View at: https://github.com/polywock/globalSpeed/releases/tag/${tag}`)
}

main()

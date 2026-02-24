const fs = require('fs')
const path = require('path')

function loadConfig() {
  const candidates = ['config.yaml', 'config.yml', 'config.json'].map((name) =>
    path.join(__dirname, name)
  )

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue

    const raw = fs.readFileSync(filePath, 'utf8')
    try {
      if (filePath.endsWith('.json')) return JSON.parse(raw)

      const yaml = require('js-yaml')
      return yaml.load(raw)
    } catch (e) {
      throw new Error(`failed to parse ${path.basename(filePath)}: ${e}`)
    }
  }

  throw new Error(
    `no config file found (expected one of: ${candidates.map((p) => path.basename(p)).join(', ')})`
  )
}

module.exports = loadConfig()


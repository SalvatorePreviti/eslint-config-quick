const fs = require('fs')
const getAppRootPath = require('./getAppRootPath')

let hasPrettierCache

/**
 * Check wether prettier is present in the main package.json
 *
 * @returns {boolean} True if prettier is present in the main package.json
 */
function hasPrettier() {
  if (hasPrettierCache !== undefined) {
    return hasPrettierCache
  }
  hasPrettierCache = false
  try {
    const requireOptions = { paths: [getAppRootPath()] }
    const manifestPath = require.resolve('./package.json', requireOptions)
    const manifest = JSON.parse(fs.readFileSync(manifestPath))
    if ((manifest.devDependencies && manifest.devDependencies.prettier) || (manifest.dependencies && manifest.dependencies.prettier)) {
      if (require.resolve('prettier', requireOptions)) {
        hasPrettierCache = true
      }
    }
  } catch (e) {
    // Ignore error
  }
  return hasPrettierCache
}

module.exports = hasPrettier

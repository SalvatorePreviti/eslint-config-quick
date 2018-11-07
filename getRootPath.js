/* eslint global-require:0 */

const path = require('path')
const process = require('process')

let rootPathCache

/**
 * Gets the application root folder
 *
 * @returns {string} The root folder
 */
function getRootPath() {
  if (process.env.APP_ROOT_PATH) {
    return path.resolve(process.env.APP_ROOT_PATH)
  }
  if (rootPathCache) {
    return rootPathCache
  }
  let result
  const dir = path.resolve(__dirname)
  if ((require('module').globalPaths || []).some(x => dir.indexOf(x) === 0)) {
    result = path.dirname(require.main.filename)
    const npmGlobalModuleDir = path.resolve(
      process.platform === 'win32' ? path.dirname(process.execPath) : path.dirname(path.dirname(process.execPath)),
      'lib',
      'node_modules'
    )
    if (result.indexOf(npmGlobalModuleDir) !== -1 && result.indexOf(`${path.sep}bin`) === result.length - 4) {
      result = result.slice(0, -4)
    }
  } else {
    const nodeModulesDir = `${path.sep}node_modules`
    if (dir.indexOf(nodeModulesDir) !== -1) {
      result = dir.split(nodeModulesDir)[0]
    }
    if (result === undefined) {
      result = path.dirname(require.main.filename)
    }
  }

  rootPathCache = result || '.'
  return rootPathCache
}

module.exports = getRootPath

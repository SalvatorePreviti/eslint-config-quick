/* eslint global-require: 0 */

const path = require('path')

function getAppRootPath() {
  if (process.env.APP_ROOT_PATH)
    return path.resolve(process.env.APP_ROOT_PATH)

  const resolved = path.resolve(__dirname)
  let alternateMethod = false

  const globalPaths = require('module').globalPaths

  for (const p of globalPaths) {
    if (resolved.indexOf(p) === 0) {
      alternateMethod = true
      break
    }
  }

  let result
  if (!alternateMethod) {
    const nodeModulesDir = `${path.sep}node_modules`
    if (resolved.indexOf(nodeModulesDir) !== -1)
      result = resolved.split(nodeModulesDir)[0]
  }

  if (!result)
    result = path.dirname(require.main.filename)

  if (alternateMethod) {
    const npmGlobalPrefix = process.platform === 'win32'
      ? path.dirname(process.execPath)
      : path.dirname(path.dirname(process.execPath))
    const npmGlobalModuleDir = path.resolve(npmGlobalPrefix, 'lib', 'node_modules')
    if (result.indexOf(npmGlobalModuleDir) !== -1 &&
      result.indexOf(`${path.sep}bin`) === result.length - 4)
      return result.slice(0, -4)
  }

  return result
}

module.exports = getAppRootPath()

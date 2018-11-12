const fs = require('fs')
const path = require('path')

let globalValue

function loadAppRootPath() {
  let result
  const dir = path.resolve(__dirname)

  // eslint-disable-next-line global-require
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

  if (!result) {
    result = process.cwd() || '.'
  }

  try {
    let bestChoice = result
    let current = result
    for (;;) {
      if (fs.existsSync(path.join(current, 'package.json'))) {
        bestChoice = current
        if (current.indexOf(`${path.sep}node_modules${path.sep}`) <= 0) {
          break
        }
      }
      const parent = path.dirname(current)
      if (!parent || parent === current) {
        break
      }
      current = parent
    }
    result = bestChoice
  } catch (e) {
    // Ignore error
  }
  return result
}

function getAppRootPath() {
  if (globalValue) {
    return globalValue
  }
  if (process.env.APP_ROOT_PATH) {
    return path.resolve(process.env.APP_ROOT_PATH)
  }

  globalValue = loadAppRootPath()
  return globalValue
}

getAppRootPath.path = ''

function setAppRootPath(value) {
  if (!value) {
    value = undefined
  } else if (typeof value !== 'string') {
    throw new TypeError('setAppRootPath requires a string')
  }
  globalValue = value
}

Object.defineProperties(getAppRootPath, {
  toJSON: { value: getAppRootPath, enumerable: false, writable: true, configurable: true },
  valueOf: { value: getAppRootPath, enumerable: false, writable: true, configurable: true },
  toString: { value: getAppRootPath, enumerable: false, writable: true, configurable: true },
  loadAppRootPath: { value: loadAppRootPath, enumerable: false, writable: true, configurable: true },
  path: {
    get: getAppRootPath,
    set: setAppRootPath,
    configurable: true,
    enumerable: true
  }
})

module.exports = getAppRootPath

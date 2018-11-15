const fs = require('fs')
const path = require('path')

/** @type {string|undefined} */
let appRootPathValue

/**
 * Checks if a directory is in the global node paths.
 *
 * @param {string} dir The directory to check
 * @returns {boolean} True if the given directory is in a global node path, false if not
 */
function isGlobalDirectory(dir) {
  /** @type {any} */
  // eslint-disable-next-line global-require
  const m = require('module')
  const globalPaths = m.globalPaths
  if (Array.isArray(globalPaths)) {
    const len = globalPaths.length
    for (let i = 0; i < len; ++i) {
      const globalPath = globalPaths[i]
      if (dir.indexOf(globalPath) === 0) {
        return true
      }
    }
  }
  return false
}

/** @returns {string} Computes the app root path. */
function loadAppRootPath() {
  let result

  const env = process.env

  if (env.LAMBDA_TASK_ROOT && env.AWS_EXECUTION_ENV && env.AWS_LAMBDA_FUNCTION_NAME && path.sep === '/') {
    try {
      if (fs.existsSync(env.LAMBDA_TASK_ROOT)) {
        return env.LAMBDA_TASK_ROOT
      }
    } catch (e) {
      // Ignore error
    }
  }

  if (!env.VSCODE_PID || !env.VSCODE_IPC_HOOK) {
    const dir = path.resolve(__dirname)
    const requireMain = require.main
    if (requireMain && isGlobalDirectory(dir)) {
      result = path.dirname(requireMain.filename)
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
      if (!result && requireMain) {
        result = path.dirname(requireMain.filename)
      }
    }
  }

  try {
    if (!result) {
      result = process.cwd()
      if (!result) {
        return ''
      }
    }

    // eslint-disable-next-line global-require
    const homeDir = require('os').homedir() || path.resolve('/')

    let bestChoice = result
    for (let current = result; ; ) {
      if (current === homeDir || current === '/var/task') {
        break
      }
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

  return result || ''
}

/**
 * Sets the app root path value
 *
 * @param {string|undefined} value The new app root path value.
 * @returns {void}
 */
function setAppRootPath(value) {
  if (!value) {
    value = undefined
  } else if (typeof value !== 'string') {
    throw new TypeError('setAppRootPath requires a string')
  }
  appRootPathValue = value
}

/**
 * Gets the app root path (the root folder for the application)
 *
 * @returns {string} The app root path, the root folder for the application
 */
function getAppRootPath() {
  let result = appRootPathValue
  if (!result) {
    result = process.env.APP_ROOT_PATH
    if (result) {
      return path.resolve(result)
    }
    result = loadAppRootPath()
    appRootPathValue = result
  }
  return result
}

/**
 * Given an absolute path, returns the shortest path to the app root path.
 * This function does nothing if the given path is not absolute.
 *
 * @param {string} file The path to relativize.
 * @returns {string} The relativize or absolute path (depending which one is shorter)
 */
function shortenPath(file) {
  if (path.isAbsolute(file)) {
    let relativized = path.relative(getAppRootPath(), file)
    if (!relativized.startsWith('.') && !relativized.startsWith(path.sep)) {
      relativized = `.${path.sep}${relativized}`
    }
    if (relativized.length < file.length) {
      file = relativized
    }
  }
  return file
}

getAppRootPath.path = ''
getAppRootPath.shortenPath = shortenPath
getAppRootPath.getAppRootPath = getAppRootPath
getAppRootPath.setAppRootPath = setAppRootPath

Object.defineProperties(getAppRootPath, {
  path: { get: getAppRootPath, set: setAppRootPath, configurable: true, enumerable: true },
  toJSON: { value: getAppRootPath, enumerable: false, writable: true, configurable: true },
  valueOf: { value: getAppRootPath, enumerable: false, writable: true, configurable: true },
  toString: { value: getAppRootPath, enumerable: false, writable: true, configurable: true },
  getAppRootPath: { value: getAppRootPath, enumerable: false, writable: true, configurable: true },
  setAppRootPath: { value: setAppRootPath, enumerable: false, writable: true, configurable: true },
  shortenPath: { value: shortenPath, enumerable: false, writable: true, configurable: true }
})

module.exports = getAppRootPath

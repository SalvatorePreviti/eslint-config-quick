/* eslint-disable no-console */
'use strict'

const util = require('util')
const path = require('path')
const fs = require('fs')
const os = require('os')
const cjs = require('module')
const getAppRootPath = setup()

function isGlobalDirectory(dir) {
  if (typeof dir === 'string') {
    const globalPaths = cjs.globalPaths
    if (globalPaths) {
      for (let i = 0, len = globalPaths.length; i < len; ++i) {
        if (dir.startsWith(globalPaths[i])) {
          return true
        }
      }
    }
  }
  return false
}

function isGit(p) {
  try {
    return fs.statSync(path.join(p, '.git')).isDirectory() && fs.statSync(path.join(p, '.gitignore')).isFile()
  } catch (error) {
    return false
  }
}

function readManifest(p) {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(p, 'package.json')).toString())
    if (typeof m === 'object' && m !== null && typeof m.name === 'string') {
      return m
    }
  } catch (error) {}
  return null
}

function dirpath(s) {
  if (typeof s === 'string' && s.length) {
    try {
      s = path.resolve(s)
      return fs.existsSync(s) ? s : ''
    } catch (error) {}
  }
  return ''
}

function bool(value) {
  switch (value) {
    case true:
    case 'true':
    case 'True':
    case 'TRUE':
    case '1':
      return true
    case false:
    case 'false':
    case 'False':
    case 'FALSE':
    case '0':
      return false
  }
  return undefined
}

function setup() {
  const uniqueSym = Symbol.for('⭐ get-app-root-path ⭐')
  let sr = global[uniqueSym]
  if (typeof sr === 'function') {
    sr.coreModule(module)
    return sr
  }
  const { defineProperty } = Reflect
  const env = process.env
  const initialCwd = path.resolve(process.cwd())
  const lambdaTaskRoot = dirpath(path.sep === '/' && env.AWS_EXECUTION_ENV && env.AWS_LAMBDA_FUNCTION_NAME && env.LAMBDA_TASK_ROOT)
  const isLambda = !!lambdaTaskRoot
  let singletonModules
  let hasFlagCache

  function hasArgvFlag(flag) {
    const found = hasFlagCache && hasFlagCache[flag]
    if (found !== undefined) {
      return found
    }
    let result = false
    const argv = process.argv
    if (argv && typeof argv.indexOf === 'function') {
      const prefix = flag.startsWith('-') ? '' : flag.length === 1 ? '-' : '--'
      const pos = argv.indexOf(prefix + flag)
      const terminatorPos = argv.indexOf('--')
      result = pos !== -1 && (terminatorPos === -1 ? true : pos < terminatorPos)
      if (hasFlagCache === undefined) {
        hasFlagCache = Object.create(null)
      }
      hasFlagCache[flag] = result
    }
    return result
  }

  let isTesting
  let isLocal
  let isGitRepo
  let appName
  let initialized = false
  if (isLambda) {
    isLocal = bool(process.env.IS_OFFLINE)
  }
  let root
  let manifest
  sr = function() {
    if (!initialized) {
      init()
    }
    return root
  }

  function shortenPath(filepath, rootDir = sr()) {
    filepath = path.normalize(filepath)
    if (path.isAbsolute(filepath)) {
      const p = path.normalize(path.relative(rootDir, filepath))
      if (p.length < filepath.length) {
        filepath = p
      }
    }
    return filepath
  }

  function setPath(value) {
    root = path.resolve(value)
    env.APP_ROOT_PATH = root
  }

  function getIsLocal() {
    if (isLocal === undefined) {
      init()
    }
    return isLocal
  }

  function setIsLocal(value) {
    const v = bool(value)
    if (v === undefined) {
      throw new TypeError('isLocal must be a boolean value')
    }
    isLocal = v
    env.isLocal = v ? 'true' : undefined
  }

  function getIsTesting() {
    if (isTesting === undefined) {
      const g = global
      if (
        typeof g.it === 'function' &&
        typeof g.describe === 'function' &&
        typeof g.afterEach === 'function' &&
        typeof g.beforeEach === 'function' &&
        ((typeof g.before === 'function' && typeof g.after === 'function') ||
          (typeof g.beforeAll === 'function' && typeof g.afterAll === 'function'))
      ) {
        isTesting = true
        return true
      }
      return false
    }
    return isTesting
  }

  function setIsTesting(value) {
    isTesting = bool(value) || !!value
  }

  function init() {
    initialized = true
    if (isLocal === undefined) {
      isLocal = bool(env.isLocal)
      if (isLocal === undefined) {
        isLocal = bool(env.npm_config_isLocal)
        if (isLocal === undefined && (env.NODE_ENV === 'development' || isTesting || (env.VSCODE_PID && env.VSCODE_IPC_HOOK))) {
          isLocal = true
        }
      }
    }
    root = dirpath(root) || dirpath(env.APP_ROOT_PATH)
    if (!root) {
      if (env.VSCODE_PID && env.VSCODE_IPC_HOOK) {
        root = initialCwd
      } else {
        root = path.resolve(__dirname || '')
        const m = require.main
        if (m && typeof m.filename === 'string' && isGlobalDirectory(root)) {
          root = path.dirname(m.filename)
          const g = path.resolve(
            (process.platform === 'win32' ? path.dirname(process.execPath) : path.dirname(path.dirname(process.execPath))) || '',
            'lib',
            'node_modules'
          )
          if (root.indexOf(g) !== -1 && root.indexOf(`${path.sep}bin`) === root.length - 4) {
            root = root.slice(0, -4)
          }
        }
      }
      const nm = `${path.sep}node_modules`
      const nmi = root.indexOf(nm + path.sep)
      if (nmi > 0) {
        root = root.slice(0, nmi) || root
      }
      if (root.endsWith(nm)) {
        root = root.slice(0, root.length - nm.length) || root
      }
      let home
      for (let current = root; current; ) {
        const m = readManifest(current)
        if (m) {
          manifest = m
          root = current
          const ir = bool(m.root)
          if (ir !== false) {
            if (ir === true) {
              break
            }
            isGitRepo = isGit(root)
            if (isGitRepo) {
              break
            }
          }
        }
        const parent = path.dirname(current)
        if (!parent || parent === current || isLambda) {
          break
        }
        if (home === undefined) {
          home = os.homedir() || ''
        }
        if (parent === home || parent === '/') {
          break
        }
        current = parent
      }
    }
    if (manifest === undefined) {
      manifest = readManifest(root)
    }
    if (isGitRepo === undefined) {
      isGitRepo = isGit(root)
    }
    if (!manifest) {
      manifest = { name: path.basename(root), private: true }
    }
    appName = manifest.name
    if (isLocal === undefined) {
      isLocal = bool(manifest.isLocal)
      if (isLocal === undefined) {
        const config = manifest.config
        if (config) {
          isLocal = bool(config.isLocal)
        }
        if (isLocal === undefined) {
          isLocal = isGitRepo
        }
      }
    }
    env.APP_ROOT_PATH = root
    setIsLocal(isLocal)
  }

  function createRequireFromPath(filename) {
    const m = new cjs(filename)
    m.filename = filename
    m.paths = cjs._nodeModulePaths(path.dirname(filename))

    function require(id) {
      return m.require(id)
    }

    require.resolve = function resolve(request, options) {
      return cjs._resolveFilename(request, m, false, options)
    }
    return require
  }

  function getModuleFromRequireCache(module, caller) {
    return requireModule(module, caller || getModuleFromRequireCache, false)
  }

  function requireModule(module, caller, canRequire = true) {
    if (typeof module === 'string') {
      let fname = __dirname
      const oldStackLimit = Error.stackTraceLimit
      const oldPrepareStackTrace = Error.prepareStackTrace
      try {
        Error.stackTraceLimit = 1
        Error.prepareStackTrace = (_err, stack) => {
          return (stack && stack[0] && stack[0].getFileName()) || undefined
        }
        const obj = { stack: undefined }
        Error.captureStackTrace(obj, caller || requireModule)
        fname = obj.stack || __dirname
      } finally {
        Error.prepareStackTrace = oldPrepareStackTrace
        Error.stackTraceLimit = oldStackLimit
      }
      let customRequire
      if (fname !== __dirname) {
        customRequire = (cjs.createRequireFromPath || createRequireFromPath)(fname)
      } else {
        customRequire = require
      }
      const modulePath = customRequire.resolve(module)
      module = require.cache[modulePath]
      if (!module) {
        if (!canRequire) {
          return undefined
        }
        customRequire(modulePath)
        module = require.cache[modulePath]
      }
    }
    if (typeof module !== 'object' || module === null) {
      throw new Error(`Cannot resolve module "${module}"`)
    }
    return module
  }

  function coreModule(module) {
    if (typeof module !== 'object') {
      module = requireModule(module, coreModule)
    }
    if (module.unloadable) {
      return module
    }
    defineProperty(module, 'unloadable', { value: true, configurable: true, writable: true })
    if (isLambda && !isLocal) {
      return module
    }
    const key = module.filename || module.id
    if (typeof key === 'string' && key.length) {
      defineProperty(require.cache, key, {
        get() {
          return module
        },
        set: doNothing,
        configurable: true,
        enumerable: false
      })
    }
    return module
  }

  const nodeModulesPlusSlash = `${path.sep}node_modules${path.sep}`
  const singletonVersionSym = Symbol.for('#singleton-module-version')

  function singletonModule(module, activator, version = 0) {
    module = requireModule(module, singletonModule)
    const key = module.filename || module.id
    if ((isLambda && !isLocal) || typeof key !== 'string' || key.length === 0) {
      if (!module.unloadable) {
        coreModule(module)
        if (typeof activator === 'function') {
          activator(module)
        }
      }
      return module
    }
    if (module[singletonVersionSym] !== undefined) {
      return module
    }
    let singletonKey = key
    const indexOfNodeModules = key.lastIndexOf(nodeModulesPlusSlash)
    if (indexOfNodeModules >= 0) {
      singletonKey = key.slice(indexOfNodeModules + nodeModulesPlusSlash.length)
    }
    const found = singletonModules && singletonModules[singletonKey]
    if (found !== undefined && found[singletonVersionSym] >= version) {
      module.exports = found.exports

      coreModule(module)
      return found
    }
    if (typeof activator === 'function') {
      activator(module)
    }
    module[singletonVersionSym] = version
    coreModule(module)
    if (singletonModules === undefined) {
      singletonModules = Object.create(null)
    }
    singletonModules[singletonKey] = module
    return module
  }

  async function executeExecutableModule(module, functor) {
    module = requireModule(module, executeExecutableModule)
    module.executable = true
    const f = functor || module.exports
    let name
    const fname = module.filename
    if (typeof fname === 'string' && fname.length) {
      name = path.basename(fname, '.js')
      if (name === 'index') {
        name = path.dirname(fname)
      }
    }
    if (!name) {
      name = 'module'
    }
    if (!f.name) {
      try {
        defineProperty(f, 'name', { value: name, configurable: true, writable: true })
      } catch (error) {}
    }
    const n = `- running ${name}`
    console.info(n)
    console.time(n)
    try {
      await new Promise(setImmediate)
      await functor()
    } catch (error) {
      if (!process.exitCode) {
        process.exitCode = -1
      }
      console.error('Error ', n, error)
    } finally {
      console.timeEnd(n)
    }
  }

  function executableModule(module, functor) {
    if (typeof functor !== 'function') {
      if (functor !== undefined) {
        throw new TypeError(`Argument "functor" must be a function but is ${typeof functor}`)
      }
      functor = module.exports
      if (typeof functor !== 'function') {
        throw new TypeError(`module.exports must be a function but is ${typeof functor}`)
      }
    }
    if (require.main === module) {
      executeExecutableModule(module, functor)
    }
    return module
  }

  function getInfo() {
    if (!initialized) {
      init()
    }
    const result = {}
    for (const k of Object.keys(sr)) {
      const v = sr[k]
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        result[k] = v
      }
    }
    return result
  }

  let terminalColorSupport

  function getTerminalColorSupport() {
    if (isLambda && !isLocal) {
      return 0
    }
    if (terminalColorSupport === undefined) {
      terminalColorSupport = loadTerminalColorSupport()
    }
    return terminalColorSupport
  }

  function setTerminalColorSupport(value) {
    if (value !== undefined) {
      if (value === true) {
        terminalColorSupport = 1
      } else if (value === false) {
        terminalColorSupport = 0
      } else {
        value = Number.parseInt(value, 10)
      }
      if (value < 0) {
        value = 0
      }
      if (value > 3) {
        value = 3
      }
    }
    terminalColorSupport = value
  }

  function loadTerminalColorSupport() {
    // Based on https://github.com/chalk/supports-color
    let forceColor
    if (hasArgvFlag('no-color') || hasArgvFlag('no-colors') || hasArgvFlag('color=false')) {
      forceColor = false
    } else if (hasArgvFlag('color') || hasArgvFlag('colors') || hasArgvFlag('color=true') || hasArgvFlag('color=always')) {
      forceColor = true
    }
    const envForceColor = env.FORCE_COLOR
    if (envForceColor !== undefined) {
      forceColor = envForceColor.length === 0 || parseInt(envForceColor, 10) !== 0
    }
    if (forceColor === false) {
      return 0
    }
    if (hasArgvFlag('color=16m') || hasArgvFlag('color=full') || hasArgvFlag('color=truecolor')) {
      return 3
    }
    if (hasArgvFlag('color=256')) {
      return 2
    }
    if ((!process.stdout.isTTY || !process.stderr.isTTY) && forceColor !== true) {
      return 0
    }
    const min = forceColor ? 1 : 0
    if (process.platform === 'win32') {
      // Windows 10 build 14931 is the first release that supports 16m/TrueColor.
      const osRelease = os.release().split('.')
      if (Number(process.versions.node.split('.')[0]) >= 8 && Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
        return Number(osRelease[2]) >= 14931 ? 3 : 2
      }
      return 1
    }
    if ('CI' in env) {
      if ('TRAVIS' in env || 'CIRCLECI' in env || 'APPVEYOR' in env || 'GITLAB_CI' in env || env.CI_NAME === 'codeship') {
        return 1
      }
      return min
    }
    const teamcityVersion = env.TEAMCITY_VERSION
    if (typeof teamcityVersion === 'string') {
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(teamcityVersion) ? 1 : 0
    }
    if (env.COLORTERM === 'truecolor') {
      return 3
    }
    const termProgram = env.TERM_PROGRAM
    if (typeof termProgram === 'string') {
      if (termProgram === 'iTerm.app') {
        return parseInt(termProgram.split('.')[0], 10) >= 3 ? 3 : 2
      }
      if (termProgram === 'Apple_Terminal.app') {
        return 2
      }
    }
    const envTerm = env.TERM
    if (typeof envTerm === 'string') {
      if (/-256(color)?$/i.test(envTerm)) {
        return 2
      }
      if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(envTerm)) {
        return 1
      }
    }
    return 'COLORTERM' in env ? 1 : min
  }

  if (util.inspect.defaultOptions && !util.inspect.defaultOptions.colors && getTerminalColorSupport() > 0) {
    util.inspect.defaultOptions.colors = true
  }
  Object.defineProperties(sr, {
    name: { value: 'getAppRootPath', configurable: true },
    globalCache: { value: Object.create(null) },
    default: { value: sr, writable: true, configurable: true },
    getModuleFromRequireCache: { value: getModuleFromRequireCache, writable: true, configurable: true },
    requireModule: { value: requireModule, writable: true, configurable: true },
    hasArgvFlag: { value: hasArgvFlag, writable: true, configurable: true },
    coreModule: { value: coreModule, writable: true, configurable: true },
    singletonModule: { value: singletonModule, writable: true, configurable: true },
    executableModule: { value: executableModule, writable: true, configurable: true },
    getPath: { value: sr },
    setPath: { value: setPath, writable: true },
    shortenPath: { value: shortenPath },
    getIsLocal: { value: getIsLocal },
    setIsLocal: { value: setIsLocal },
    getIsTesting: { value: getIsTesting },
    setIsTesting: { value: setIsTesting },
    initialCwd: { value: initialCwd },
    env: { value: env },
    isLambda: { value: isLambda, enumerable: true },
    isLocal: { get: getIsLocal, set: setIsLocal, enumerable: true },
    isTesting: { get: getIsTesting, set: setIsTesting, enumerable: true },
    shared: { value: Object.create(null), enumerable: false, configurable: false, writable: false },
    terminalColorSupport: { get: getTerminalColorSupport, set: setTerminalColorSupport, configurable: true, enumerable: true },
    isGitRepo: {
      get() {
        if (!initialized) {
          init()
        }
        return isGitRepo
      },
      enumerable: true
    },
    path: {
      get: sr,
      set(value) {
        sr.setPath(value)
      },
      enumerable: true
    },
    applicationName: {
      get() {
        if (!initialized) {
          init()
        }
        return appName
      },
      set(value) {
        appName = value !== null && value !== undefined ? `${value}` : ''
      },
      enumerable: true,
      configurable: true
    },
    manifest: {
      get() {
        if (!initialized) {
          init()
        }
        return manifest
      },
      enumerable: false
    },
    toJSON: {
      value: getInfo,
      writable: true,
      configurable: true
    },
    toString: { value: sr, writable: true, configurable: true }
  })
  defineProperty(sr, util.inspect.custom, {
    value: getInfo,
    writable: true,
    configurable: true
  })

  function doNothing() {}

  defineProperty(global, uniqueSym, { value: sr, configurable: true, writable: true })

  module.exports = sr

  singletonModule(module)
  return sr
}

module.exports = getAppRootPath

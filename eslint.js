#!/usr/bin/env node

/* eslint no-console: 0 */
/* eslint global-require: 0 */

const spawn = require('child_process').spawn
const path = require('path')

class ESLintError extends Error {
  constructor(elapsed) {
    const message = `eslint failed (${elapsed}ms)`
    super(message)
    this.name = this.constructor.name
    this.stack = message
  }
}

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
    const npmGlobalPrefix = process.platform === 'win32' ? path.dirname(process.execPath) : path.dirname(path.dirname(process.execPath))
    const npmGlobalModuleDir = path.resolve(npmGlobalPrefix, 'lib', 'node_modules')
    if (result.indexOf(npmGlobalModuleDir) !== -1 && result.indexOf(`${path.sep}bin`) === result.length - 4)
      return result.slice(0, -4)
  }

  return result
}

const defaultOptions = {
  path: getAppRootPath(),
  extensions: ['.js, .jsx'],
  arguments: ['--cache'],
  stdio: 'inherit',
  Promise
}

function eslint(options = eslint.defaultOptions, callback = null) {
  let hrtime = process.hrtime()

  if (typeof options !== 'object') {
    if (typeof options === 'function')
      callback = options
    options = eslint.defaultOptions
  }

  if (typeof callback !== 'function') {
    return new options.Promise((resolve, reject) => {
      eslint(options, (error) => (error ? reject(error) : resolve()))
    })
  }

  options = Object.assign({}, eslint.defaultOptions, options)

  const args = [require.resolve('eslint/bin/eslint.js'), '.', ...options.arguments]

  for (const extension of options.extensions) {
    args.push('--ext')
    args.push(extension)
  }

  const child = spawn('node', args, {
    stdio: options.stdio,
    cwd: options.path
  })

  child.on('exit', error => {
    hrtime = process.hrtime(hrtime)
    const elapsed = ((hrtime[0] * 1000000) + (hrtime[1] / 1000000)).toFixed(3)
    if (error) {
      if (!(error instanceof Error))
        error = new ESLintError(elapsed)
      if (options.stdio === 'inherit')
        console.error(`${error.name}: ${error.message}`)
      callback(error)
    } else {
      if (options.stdio === 'inherit')
        console.info(`eslint OK (${elapsed}ms)`)
      callback(null, elapsed)
    }
  })

  return undefined
}

eslint.ESLintError = ESLintError
eslint.defaultOptions = defaultOptions

if (require.main === module) {
  eslint((error) => {
    if (error) {
      process.exit(1)
    }
  })
}

module.exports = eslint

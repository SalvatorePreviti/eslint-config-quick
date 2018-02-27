#!/usr/bin/env node

/* eslint no-console: 0 */
/* eslint global-require: 0 */

const spawn = require('child_process').spawn
const rootPath = require('./lib/appRootPath')
const chalk = require('chalk').default

class ESLintError extends Error {
  constructor(elapsed) {
    const message = `eslint failed (${elapsed}ms)`
    super(message)
    this.name = this.constructor.name
    this.stack = message
  }
}

const defaultOptions = {
  path: rootPath,
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

  if (options.stdio === 'inherit') {
    console.info(`${chalk.gray('ESLint running...')}`)
  }

  const args = [require.resolve('eslint/bin/eslint.js'), '.', ...options.arguments]

  for (const extension of options.extensions) {
    args.push('--ext')
    args.push(extension)
  }

  if (!chalk.enabled)
    args.push('--no-color')

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
        console.error(`${
          chalk.redBright.underline.bold(error.name)}${
          chalk.redBright(':')} ${
          chalk.redBright(error.message)}\n`)

      callback(error)
    } else {
      if (options.stdio === 'inherit')
        console.info(`${chalk.green('\nESLint OK')} ${chalk.gray(`(${elapsed}ms)`)}\n`)
      callback(null, elapsed)
    }
  })

  return undefined
}

eslint.ESLintError = ESLintError
eslint.defaultOptions = defaultOptions

if (require.main === module) {

  switch (process.argv[2]) {
    case 'init':
      require('./lib/quick-eslint-init')()
      break

    default:
      eslint({
        arguments: [...defaultOptions.arguments, ...process.argv.slice(2)]
      }, (error) => {
        if (error) {
          process.exit(1)
        }
      })
      break
  }
}

module.exports = eslint
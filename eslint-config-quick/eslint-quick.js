#!/usr/bin/env node

/* eslint no-process-exit:0, global-require:0, no-console:0 */

const process = require('process')
const path = require('path')
const spawn = require('child_process').spawn
const getRootPath = require('./getRootPath')

class ESLintOptions {
  constructor() {
    this.fail = true
    this.stdio = 'inherit'
    this.cache = true
    this.arguments = []
    this.extensions = ['js', 'jsx']
    this.appRootPath = ''
  }
}

function generateArguments(options) {
  const eslintPath = require.resolve('eslint/bin/eslint.js')
  const result = [eslintPath, '.']
  if (Array.isArray(options.extensions)) {
    for (const extension of options.extensions) {
      if (extension) {
        result.push('--ext', extension.startsWith('.') ? extension : `.${extension}`)
      }
    }
  }
  if (options.cache) {
    result.push('--cache')
  }
  if (Array.isArray(options.arguments)) {
    result.push(...options.arguments)
  }
  return result
}

function cleanupError(error) {
  if (!(error instanceof Error)) {
    try {
      error = new Error(`eslint failed - ${error}`)
    } catch (e) {
      error = new Error('eslint failed')
    }
  }
  try {
    Object.defineProperty(error, 'showStack', { value: false, enumerable: false, configurable: true, writable: true })
  } catch (e) {
    // Do nothing
  }
  try {
    Error.captureStackTrace(error, eslint)
  } catch (e) {
    // Do nothing
  }
}

/**
 * Executes eslint for a project, asynchronously.
 * @param {boolean|ESLintOptions|undefined} [options=undefined] The options to use. If a boolean, options will be { fail: true|false }.
 * @returns {Promise<boolean>} A promise
 */
function eslint(options) {
  if (typeof options === 'boolean') {
    options = { fail: options }
  }
  options = { ...new ESLintOptions(), ...options }

  return new Promise((resolve, reject) => {
    const args = generateArguments(options)
    const child = spawn('node', args, { stdio: options.stdio, cwd: path.resolve(options.appRootPath || getRootPath()) })

    function handleError(error) {
      if (options.fail === false) {
        resolve(false)
      } else {
        reject(cleanupError(error))
      }
    }

    child.on('error', handleError)

    child.on('exit', error => {
      if (error) {
        handleError(error)
      } else {
        resolve(true)
      }
    })
  })
}

function init(rootPath) {
  return require('./eslint-quick-init')(rootPath)
}

eslint.init = init

module.exports = eslint

if (require.main === module) {
  const indexOfInit = process.argv.indexOf('--init')
  if (indexOfInit > 1) {
    console.info('eslint-config-quick init')
    console.time('eslint --init')
    init(process.argv[indexOfInit + 1])
      .then(() => {
        console.timeEnd('eslint --init')
      })
      .catch(e => {
        console.error(' * eslint --init failed * ')
        console.error(e)
        console.timeEnd('eslint --init')
        process.exit(1)
      })
  } else {
    console.info('running eslint')
    console.time('eslint')
    eslint({ arguments: process.argv.slice(2) })
      .then(() => {
        console.timeEnd('eslint')
      })
      .catch(() => {
        console.timeEnd('eslint')
        process.exit(1)
      })
  }
}

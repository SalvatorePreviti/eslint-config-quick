#!/usr/bin/env node

/* eslint no-process-exit:0, global-require:0, no-console:0 */

const process = require('process')
const path = require('path')
const spawn = require('child_process').spawn
const getAppRootPath = require('./getAppRootPath')

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
    const child = spawn('node', args, { stdio: options.stdio, cwd: path.resolve(options.appRootPath || getAppRootPath()) })

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

module.exports = eslint

if (require.main === module) {
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

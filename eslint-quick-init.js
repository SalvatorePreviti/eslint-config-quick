/* eslint-disable no-console */
const getRootPath = require('./getRootPath')
const path = require('path')
const util = require('util')
const fs = require('fs')

const mkdir = util.promisify(fs.mkdir)
const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)

function resolveFromRoot(pathToResolve) {
  if (path.isAbsolute(pathToResolve)) {
    return path.resolve(pathToResolve)
  }
  return path.resolve(path.join(getRootPath(), pathToResolve))
}

function resolveFromModule(pathToResolve) {
  return path.resolve(path.join(__dirname, pathToResolve))
}

async function loadText(textPath, options = { throwIfNotFound: false }) {
  try {
    return await readFile(resolveFromRoot(textPath), 'utf8')
  } catch (e) {
    if (!e || e.code !== 'ENOENT' || options.throwIfNotFound) {
      throw e
    }
    return undefined
  }
}

async function loadJson(jsonPath, options = { throwIfNotFound: false }) {
  const text = await loadText(jsonPath, options)
  return text !== undefined ? JSON.parse(text) : undefined
}

async function mkdirp(dirPath) {
  dirPath = resolveFromRoot(dirPath)
  try {
    await mkdir(dirPath)
  } catch (e) {
    if (!e || e.code !== 'ENOENT') {
      if (e.code === 'EEXIST') {
        return dirPath
      }
      throw e
    }
    await mkdirp(path.dirname(dirPath))
    await mkdir(dirPath)
  }
  return dirPath
}

function sortObjectKeys(o) {
  if (typeof o !== 'object') {
    return o
  }
  if (o[Symbol.iterator]) {
    return Array.from(o).map(sortObjectKeys)
  }
  const result = {}
  for (const [k, v] of Object.entries(o)) {
    result[k] = sortObjectKeys(v)
  }
  return result
}

async function writeText(textPath, text, options = { onlyIfNotExists: false }) {
  textPath = resolveFromRoot(textPath)
  if (Array.isArray(text)) {
    text = text.join('\n')
  }
  while (text.endsWith('\n')) {
    text = text.slice(0, text.length - 1)
  }

  let oldText = await loadText(textPath)
  while (oldText && oldText.endsWith('\n')) {
    oldText = oldText.slice(0, oldText.length - 1)
  }

  if (oldText !== text) {
    if (options.onlyIfNotExists) {
      console.warn('- WARNING', getRootPath.shortenPath(textPath), 'skipped, it already exists')
      return
    }

    await mkdirp(path.dirname(textPath))
    await writeFile(textPath, `${text}\n`, { encoding: 'utf8', flag: 'w' })
    console.info('-', oldText !== undefined ? 'updated' : 'written', getRootPath.shortenPath(textPath), ',', text.length, 'bytes')
  }
}

async function writeJson(jsonPath, content, options = { onlyIfNotExists: false }) {
  const text = JSON.stringify(sortObjectKeys(content), null, 2)
  await writeText(jsonPath, text, options)
}

async function initPrettierrc() {
  await writeJson('.prettierrc', {
    ...((await loadJson('.prettierrc')) || {}),
    ...(await loadJson(resolveFromModule('.prettierrc'), { throwIfNotFound: true }))
  })
}

async function initPrettierIgnore() {
  const text = await loadText(resolveFromModule('.prettierrc'), { throwIfNotFound: true })
  await writeText('.prettierignore', text, { onlyIfNotExists: true })
}

async function initEditorConfig() {
  const text = await loadText(resolveFromModule('.editorconfig'), { throwIfNotFound: true })
  await writeText('.editorconfig', text, { onlyIfNotExists: true })
}

async function init() {
  await initEditorConfig()
  await initPrettierrc()
  await initPrettierIgnore()
}

module.exports = init

init().catch(e => {
  console.error(e)
})

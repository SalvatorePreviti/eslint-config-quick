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
    let text = (await readFile(resolveFromRoot(textPath), 'utf8')).replace(/\r\n/g, '\n').trimRight()
    while (text.endsWith('\n')) {
      text = text.slice(0, text.length - 1).trimRight()
    }
    return text
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

async function writeJson(jsonPath, content, options = { sortJson: false, onlyIfNotExists: false }) {
  if (options.sortJson) {
    content = sortObjectKeys(content)
  }
  const text = JSON.stringify(content, null, 2)
  await writeText(jsonPath, text, options)
}

async function copyModuleTextFile(relativePath) {
  if (path.isAbsolute(relativePath)) {
    throw new TypeError(`copyModuleTextFile: path ${relativePath} cannot be absolute`)
  }
  const text = await loadText(resolveFromModule(relativePath), { throwIfNotFound: true })
  await writeText(resolveFromRoot(relativePath), text, { onlyIfNotExists: true })
}

async function initPrettierrc() {
  await writeJson(
    resolveFromRoot('.prettierrc'),
    {
      ...((await loadJson(resolveFromRoot('.prettierrc'))) || {}),
      ...(await loadJson(resolveFromModule('.prettierrc'), { throwIfNotFound: true }))
    },
    { sortJson: true }
  )
}

async function initEslintrcJson() {
  let eslintrc = (await loadJson(resolveFromRoot('.prettierrc'))) || {}
  let oldExtends = []
  if (Array.isArray(eslintrc.extends)) {
    oldExtends = [...eslintrc.extends]
  } else if (eslintrc.extends) {
    oldExtends = [eslintrc.extends]
  }
  if (oldExtends.includes('eslint-config-quick')) {
    delete eslintrc.extends
    eslintrc = {
      extends: ['eslint-config-quick', ...oldExtends],
      ...eslintrc
    }
  }
  await writeJson(resolveFromRoot('.prettierrc'), eslintrc, { sortJson: false })
}

async function init() {
  await copyModuleTextFile('.prettierignore')
  await copyModuleTextFile('.editorconfig')
  await copyModuleTextFile('.eslintignore')
  await initPrettierrc()
  await initEslintrcJson()
}

module.exports = init

init().catch(e => {
  console.error(e)
})

const getRootPath = require('./getRootPath')
const path = require('path')
const util = require('util')
const fs = require('fs')

const mkdir = util.promisify(fs.mkdir)
const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)

async function tryLoadText(textPath) {
  try {
    return await readFile(jsonPath, 'utf8')
  } catch (e) {
    if (e && e.code !== 'ENOENT') {
      return undefined
    }
    throw e
  }
}

async function tryLoadJson(jsonPath) {
  const text = await tryLoadText(jsonPath)
  return text !== undefined ? JSON.parse(text) : undefined
}

async function mkdirp(dirPath) {
  dirPath = path.resolve(dirPath)
  try {
    await mkdir(dirPath)
  } catch (e) {
    if (e && e.code === 'ENOENT') {
      await mkdirp(path.dirname(dirPath))
      await mkdir(dirPath)
    }
  }
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

async function writeJson(jsonPath, content) {
  const text = JSON.stringify(sortObjectKeys(content), null, 2)
  const oldText = tryLoadJson(jsonPath)
  if (oldText !== text) {
    await mkdirp(path.dirname(jsonPath))
    await writeFile(jsonPath, text, 'utf8')
    console.info('-', oldText !== undefined ? 'updated' : 'written', getRootPath.shortenPath(jsonPath)), ',', text.length, 'bytes')
  }
}

function initPrettierrc() {
  const prettierrcPath = path.join(getRootPath(), '.prettierrc')
  writeJson(prettierrcPath, {
    ...(tryLoadJson(prettierrcPath) || {}),
    bracketSpacing: true,
    jsxBracketSameLine: false,
    printWidth: 140,
    semi: false,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'none',
    useTabs: false
  })
}

function init() {
  initPrettierrc()
}

module.exports = init

tryLoadJson('./xxxx')

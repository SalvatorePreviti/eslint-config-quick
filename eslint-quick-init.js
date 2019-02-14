/* eslint-disable no-console */
const getRootPath = require('./getRootPath')
const path = require('path')
const util = require('util')
const fs = require('fs')

const mkdir = util.promisify(fs.mkdir)
const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)

async function init(projectRootPath) {
  projectRootPath = path.resolve(projectRootPath || getRootPath())
  if (projectRootPath === __dirname) {
    throw new Error('Cannot run eslint-quick init inside eslint-config-quick')
  }

  function resolveFromRoot(pathToResolve) {
    if (typeof pathToResolve !== 'string') {
      throw new TypeError(`pathToResolve must be a string but is ${typeof pathToResolve}`)
    }
    if (path.isAbsolute(pathToResolve)) {
      return path.resolve(pathToResolve)
    }
    return path.resolve(path.join(projectRootPath, pathToResolve))
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

  function mergeJson(origin, add) {
    if (typeof add !== 'object') {
      return add
    }
    if (typeof origin !== 'object' || origin === null) {
      return add
    }
    if (Array.isArray(origin) !== Array.isArray(add)) {
      return add
    }

    if (origin[Symbol.iterator]) {
      origin = Array.from(origin)
      const set = new Set(origin.map(x => JSON.stringify(sortObjectKeys(x))))
      for (const item of add) {
        if (!set.has(JSON.stringify(sortObjectKeys(item)))) {
          origin.push(item)
        }
      }
      return origin
    }

    for (const key of Object.keys(add)) {
      if (add[key] !== undefined) {
        origin[key] = mergeJson(origin[key], add[key])
      }
    }
    return origin
  }

  async function writeText(textPath, text, options = { onlyIfNotExists: false, dontWarnIfExists: false }) {
    textPath = resolveFromRoot(textPath)
    if (Array.isArray(text)) {
      text = text.join('\n')
    }
    let oldText = await loadText(textPath)
    while (oldText && oldText.endsWith('\n')) {
      oldText = oldText.slice(0, oldText.length - 1)
    }
    if (oldText !== text) {
      if (options.onlyIfNotExists && oldText !== undefined) {
        if (!options.dontWarnIfExists) {
          console.warn('- WARNING', getRootPath.shortenPath(textPath), 'skipped, it already exists')
        }
        return
      }

      await mkdirp(path.dirname(textPath))
      await writeFile(textPath, `${text}\n`, { encoding: 'utf8', flag: 'w' })
      console.info(`- ${oldText !== undefined ? 'updated ' : 'written '}${getRootPath.shortenPath(textPath)}, ${text.length}bytes`)
    }
  }

  async function writeJson(jsonPath, content, options = { sortJson: false, onlyIfNotExists: false, dontWarnIfExists: false }) {
    if (options.sortJson) {
      content = sortObjectKeys(content)
    }
    const text = JSON.stringify(content, null, 2)
    await writeText(jsonPath, text, options)
  }

  async function copyModuleTextFile(sourcePath, targetPath, options = { dontWarnIfExists: false }) {
    const text = await loadText(resolveFromModule(sourcePath), { throwIfNotFound: true })
    await writeText(resolveFromRoot(targetPath), text, { ...options, onlyIfNotExists: true })
  }

  async function initPrettierrc() {
    await writeJson(
      resolveFromRoot('.prettierrc'),
      mergeJson(
        (await loadJson(resolveFromRoot('.prettierrc'))) || {},
        await loadJson(resolveFromModule('.prettierrc'), { throwIfNotFound: true })
      ),
      { sortJson: true }
    )
  }

  async function initEslintrcJson() {
    let eslintrc = (await loadJson(resolveFromRoot('.eslintrc.json'))) || {}
    let oldExtends = []
    if (Array.isArray(eslintrc.extends)) {
      oldExtends = [...eslintrc.extends]
    } else if (eslintrc.extends) {
      oldExtends = [eslintrc.extends]
    }
    if (!oldExtends.includes('eslint-config-quick')) {
      delete eslintrc.extends
      eslintrc = {
        extends: ['eslint-config-quick', ...oldExtends],
        ...eslintrc
      }
    }
    await writeJson(resolveFromRoot('.eslintrc.json'), eslintrc, { sortJson: false })
  }

  async function initVsCodeSettings() {
    const targetPath = resolveFromRoot(path.join('.vscode', 'settings.json'))
    const target = await loadJson(targetPath)
    const source = await loadJson(resolveFromModule(path.join('.vscode', 'settings.json')))
    await writeJson(targetPath, mergeJson(target, source), { sortJson: true })
  }

  async function initVsCodeExtensions() {
    const targetPath = resolveFromRoot(path.join('.vscode', 'extensions.json'))
    const target = await loadJson(targetPath)
    const source = await loadJson(resolveFromModule(path.join('.vscode', 'extensions.json')))
    await writeJson(targetPath, mergeJson(target, source), { sortJson: true })
  }

  async function isSemverGreater(a, b) {
    async function parseSemver(v) {
      while (v && !/^[0-9.*]/.test(v)) {
        v = v.slice(1)
      }
      v.split('.')
      return [parseInt(v[0], 10), parseInt(v[1], 10), parseInt(v[2], 10)].map(x => (isNaN(x) ? Number.MAX_SAFE_INTEGER : x))
    }

    a = parseSemver(a)
    b = parseSemver(b)
    for (let i = 0; i < 3; ++i) {
      if (a[i] === b[i]) {
        break
      }
      if (a[i] > b[i]) {
        return true
      }
    }
    return false
  }

  async function initPackageJson() {
    const rootManifestPath = resolveFromRoot('package.json')
    let rootManifest = await loadJson(rootManifestPath)
    let hasRootManifest = true

    const packageName = (rootManifest && rootManifest.name) || path.basename(path.dirname(rootManifestPath))

    if (rootManifest === undefined) {
      hasRootManifest = false
      rootManifest = {
        name: packageName,
        version: '0.0.0',
        description: packageName,
        main: 'index.js',
        repository: {
          type: 'git',
          url: `git+https://github.com/username/${packageName}.git`
        },
        keywords: [packageName],
        author: 'username',
        license: 'MIT'
      }
    }
    if (!rootManifest.engines) {
      rootManifest.engines = {}
    }
    if (!rootManifest.engines.node) {
      rootManifest.engines.node = '>=8.10.0'
    }
    if (!rootManifest.devDependencies) {
      rootManifest.devDependencies = {}
    }

    const moduleManifest = await loadJson(resolveFromModule('package.json'), { throwIfNotFound: true })

    let dependenciesUpdated = 0

    function updateDependency(name) {
      let expected =
        (moduleManifest.devDependencies && moduleManifest.devDependencies[name]) ||
        (moduleManifest.dependencies && moduleManifest.dependencies[name]) ||
        (moduleManifest.peerDependencies && moduleManifest.peerDependencies[name])

      if (!expected) {
        throw new TypeError(`package ${name} does not exist in ${resolveFromModule('package.json')}`)
      }
      if (expected.startsWith('>=')) {
        expected = `^${expected.slice(2)}`
      }

      let existing =
        (rootManifest.devDependencies && rootManifest.devDependencies[name]) ||
        (rootManifest.dependencies && rootManifest.dependencies[name]) ||
        (rootManifest.peerDependencies && rootManifest.peerDependencies[name])

      if (existing) {
        if (existing.startsWith('>=')) {
          existing = `^${existing.slice(2)}`
        } else if (existing.startsWith('~')) {
          existing = `^${existing.slice(1)}`
        }

        if (existing === expected) {
          return
        }

        if (!isSemverGreater(expected, existing)) {
          return
        }

        console.warn(`Dependency "${name}" upgraded from version "${existing}" to "${expected}"`)
      }

      ++dependenciesUpdated
      rootManifest.devDependencies[name] = expected
    }

    updateDependency('@types/node')
    updateDependency('prettier')

    for (const key of Object.keys(moduleManifest.peerDependencies)) {
      updateDependency(key)
    }

    if (rootManifest.dependencies) {
      rootManifest.dependencies = sortObjectKeys(rootManifest.dependencies)
    }

    if (rootManifest.devDependencies) {
      rootManifest.devDependencies = sortObjectKeys(rootManifest.devDependencies)
    }

    if (rootManifest.peerDependencies) {
      rootManifest.peerDependencies = sortObjectKeys(rootManifest.peerDependencies)
    }

    if (!hasRootManifest) {
      console.warn('WARNING - package.json not found, creating one')
    }

    await writeJson(rootManifestPath, rootManifest, { sortJson: false })

    if (!fs.existsSync(resolveFromRoot('node_modules'))) {
      console.warn(`WARNING - node_modules does not exist, run \`npm install\` now`)
    } else if (dependenciesUpdated) {
      console.warn(`WARNING - ${dependenciesUpdated} dependencies updated, run \`npm install\` now`)
    }
  }

  console.log()
  console.log(`eslint-quick --init ${projectRootPath}`)

  await copyModuleTextFile('.prettierignore', '.prettierignore')
  await copyModuleTextFile('.editorconfig', '.editorconfig')
  await copyModuleTextFile('.eslintignore', '.eslintignore')
  await copyModuleTextFile('.gitignore.default', '.gitignore', { dontWarnIfExists: true })
  await initPrettierrc()
  await initEslintrcJson()
  await initVsCodeSettings()
  await initVsCodeExtensions()
  await initPackageJson()

  console.log('eslint-quick --init ok.')
  console.log()
}

module.exports = init

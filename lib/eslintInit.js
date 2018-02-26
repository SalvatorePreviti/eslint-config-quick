/* eslint no-console: 0 */

const spawn = require('child_process').spawn
const path = require('path')
const fs = require('fs')
const rootPath = require('./appRootPath')
const manifest = require('../package.json')

const moduleRoot = path.resolve(path.join(__dirname, '../'))

function loadJsonAsync(jsonPath) {
  return new Promise((resolve, reject) => {
    fs.readFile(jsonPath, 'utf8', (error, json) => {
      if (error)
        return reject(error)
      let data
      try {
        data = JSON.parse(json)
      } catch (ex) {
        return reject(ex)
      }
      return resolve(data)
    })
  })
}

function runNpmInstallAsync(args) {
  return new Promise((resolve, reject) => {
    args = ['i', '--save-dev', ...args]

    const child = spawn('npm', args, {
      stdio: 'inherit',
      cwd: rootPath
    })

    child.on('exit', error => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

function copyFileIfNotExistsAsync(source, destination) {
  return new Promise((resolve, reject) => {
    fs.stat(destination, (statError) => {
      if (!statError) {
        resolve()
        return
      }

      const src = fs.createReadStream(source)
      const dst = fs.createWriteStream(destination)
      src.pipe(dst)
      src.on('error', reject)
      src.on('end', () => {
        console.log(`* ${destination} created.`)
        resolve()
      })
    })
  })
}

function eslintRcExistsAsync() {
  return new Promise((resolve) => {
    const eslintFiles = [
      '.eslintrc.js',
      '.eslintrc.json',
      '.eslintrc.yaml',
      '.eslintrc.yml',
      '.eslintrc'
    ].map((name) => path.join(rootPath, name))
    let processed = 0
    let found = false
    function statResult(error) {
      ++processed
      if (!error)
        found = true
      if (processed === eslintFiles.length)
        resolve(found)
    }
    for (const filePath of eslintFiles)
      fs.stat(filePath, statResult)
  })
}

function eslintInitAsync() {
  let rootManifest
  return loadJsonAsync(path.join(rootPath, 'package.json'))
    .then((data) => {
      rootManifest = data

      const rootDevDeps = rootManifest.devDependencies || {}
      const rootDeps = rootManifest.dependencies || {}
      const depsToInstall = []

      for (const name of Object.keys(manifest.peerDependencies)) {
        if (typeof rootDevDeps[name] !== 'string' && typeof rootDeps[name] !== 'string') {
          let version = manifest.peerDependencies[name]
          if (version.startsWith('>='))
            version = `^${version.substr(2)}`
          depsToInstall.push(`${name}@${version}`)
        }
      }

      if (depsToInstall.length > 0)
        return runNpmInstallAsync(depsToInstall)

      return undefined
    })
    .then(() => {
      if (rootManifest.eslintConfig)
        return undefined
      return eslintRcExistsAsync()
        .then((found) => {
          if (found)
            return undefined
          return copyFileIfNotExistsAsync(path.join(moduleRoot, 'default.json'), path.join(rootPath, '.eslintrc.json'))
        })
    })
    .then(() => {
      return Promise.all([
        copyFileIfNotExistsAsync(path.join(moduleRoot, '.editorconfig'), path.join(rootPath, '.editorconfig')),
        copyFileIfNotExistsAsync(path.join(moduleRoot, '.eslintignore'), path.join(rootPath, '.eslintignore')),
        copyFileIfNotExistsAsync(path.join(moduleRoot, '.gitignore'), path.join(rootPath, '.gitignore'))
      ])
    })
}

function eslintInit() {
  eslintInitAsync()
    .then(() => {
      console.log('eslint ok.')
      console.log('You can now run "quick-eslint"')
    })
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

module.exports = eslintInit

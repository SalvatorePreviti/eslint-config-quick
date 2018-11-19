'use strict'

const path = require('path')
const fs = require('fs')
const os = require('os')
const cjs = require('module')

function dirpath(s) {
  if (typeof s === 'string' && s.length) {
    try {
      s = path.resolve(s)
      return fs.existsSync(s) ? s : ''
    } catch (_error) {}
  }
  return ''
}

const env = process.env
const initialCwd = path.resolve(process.cwd())
let root

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

/**
 * @exports
 * @return {string} The application root path
 */
function getRootPath() {
  if (root === undefined) {
    init()
  }
  return root
}

function isGlobalDirectory(dir) {
  if (typeof dir !== 'string') {
    return false
  }
  const globalPaths = cjs.globalPaths
  if (globalPaths) {
    for (let i = 0, len = globalPaths.length; i < len; ++i) {
      const globalPath = globalPaths[i]
      if (dir.indexOf(globalPath) === 0) {
        return true
      }
    }
  }
  return false
}

function isGit(p) {
  try {
    return fs.statSync(path.join(p, '.git')).isDirectory() && fs.statSync(path.join(p, '.gitignore')).isFile()
  } catch (_e) {
    return false
  }
}

function readManifest(p) {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(p, 'package.json')).toString())
    if (typeof m === 'object' && m !== null && typeof m.name === 'string') {
      return m
    }
  } catch (_e) {}
  return null
}

function init() {
  let manifest
  let isGitRepo
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
      if (!parent || parent === current) {
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
}

module.exports = getRootPath

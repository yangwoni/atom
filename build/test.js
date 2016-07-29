#!/usr/bin/env node

'use strict'

require('colors')
const async = require('async')
const childProcess = require('child_process')
const fs = require('fs')
const path = require('path')

const CONFIG = require('./config')

const packagedAppPath = path.resolve(__dirname, '..', 'out', 'Atom-darwin-x64')
const executablePath = path.join(packagedAppPath, 'Atom.app', 'Contents', 'MacOS', 'Atom')
const resourcePath = CONFIG.repositoryRootPath

function runCoreMainProcessTests (callback) {
  const testPath = path.join(CONFIG.repositoryRootPath, 'spec', 'main-process')
  const testArguments = [
    '--resource-path', resourcePath,
    '--test', '--main-process', testPath
  ]

  console.log('Executing core main process tests...'.bold.green)
  const cp = childProcess.spawn(executablePath, testArguments, {stdio: 'inherit'})
  cp.on('error', error => { callback(error) })
  cp.on('close', exitCode => { callback(null, exitCode) })
}

function runCoreRenderProcessTests (callback) {
  const testPath = path.join(CONFIG.repositoryRootPath, 'spec')
  const testArguments = [
    '--resource-path', resourcePath,
    '--test', testPath
  ]

  console.log('Executing core render process tests...'.bold.green)
  const cp = childProcess.spawn(executablePath, testArguments, {stdio: 'inherit'})
  cp.on('error', error => { callback(error) })
  cp.on('close', exitCode => { callback(null, exitCode) })
}

const packageTestSuites = []
for (let packageName in CONFIG.appMetadata.packageDependencies) {
  const packageSpecDirPath = path.join(CONFIG.repositoryRootPath, 'node_modules', packageName, 'spec')
  if (!fs.existsSync(packageSpecDirPath)) continue

  packageTestSuites.push(function (callback) {
    const testArguments = [
      '--resource-path', resourcePath,
      '--test', packageSpecDirPath
    ]

    console.log(`Executing ${packageName} tests...`.bold.green)
    const cp = childProcess.spawn(executablePath, testArguments, {stdio: 'inherit'})
    cp.on('error', error => { callback(error) })
    cp.on('close', exitCode => { callback(null, exitCode) })
  })
}

const testSuitesToRun = [runCoreMainProcessTests, runCoreRenderProcessTests].concat(packageTestSuites)

async.parallelLimit(testSuitesToRun, 2, function (err, exitCodes) {
  if (err) {
    console.error(err)
    process.exit(1)
  } else {
    const testsPassed = exitCodes.every(exitCode => exitCode === 0)
    process.exit(testsPassed ? 0 : 1)
  }
})
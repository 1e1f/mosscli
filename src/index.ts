/// <reference path="./@types/index.d.ts" />

import * as colors from 'chalk';
import * as yaml from 'js-yaml';
import * as os from 'os';
import * as path from 'path';
import * as minimist from 'minimist';
import * as fs from 'fs';
import { EventEmitter } from 'events';

import { check, each, extend, clone, combine, merge } from 'typed-json-transform';
import { readFileSync, writeFileSync, createWriteStream } from 'fs';
import { parse, next, start, addFunctions, getFunctions } from 'js-moss';

import { glob as _glob } from './glob';

const chalk = require('chalk');
const chromafi = require('chromafi');

import { createForm, createDts } from './dts';

const chromafiOptions = {
  lang: 'yaml',
  colors: {
    attr: chalk.green,
    bullet: chalk.green,
    string: chalk.white,
    number: chalk.white,
    base: chalk.white,
    keyword: chalk.green,
    function: chalk.white,
    // title: chalk.red,
    params: chalk.white,
    built_in: chalk.green,
    literal: chalk.green,
    class: chalk.green,
    // regexp: chalk.red,
  }
};

const name = 'moss';

const c = { g: colors.green, y: colors.yellow };

export function usage(cmd: string) {
  return `${colors.gray('usage:')} ${name}`;
}

export function manual() {
  let man = `
  ${colors.gray('usage:')} ${name} ${colors.green('command')} ${colors.yellow('option')}
  `;
  return man;
}

const platform = os.platform();
const { _, ...cliArgs } = minimist(process.argv.slice(2), { boolean: true });
const cliCommands = _;

interface Mutable {
  args: any
  environment: any
  options: any
}

const mutable: Mutable = {
  args: clone(cliArgs),
  environment: {},
  options: {}
};

const isCamelCase = (input: string) => {
  return !!input.match(/^[a-z]+[A-Z]/)
}

const camelToSnakeCase = (input: string) => {
  if (isCamelCase(input)) {
    return input.replace(/[A-Z]/g, '\_$&');
  }
  return input;
}

const jsonToEnv = (input: any, memo: string = '', parentPath: string = '') => {
  each(input, (val, key: string) => {
    const envPath = parentPath + camelToSnakeCase(key).toUpperCase();
    if (check(val, String)) {
      memo += `${envPath}=${val}\n`;
    } else if (check(val, Object)) {
      jsonToEnv(val, memo, envPath);
    }
  });
  return memo;
}

addFunctions({
  cli: (current: Moss.Layer, localArgs: any) => {
    const { data, state } = next(current, localArgs);
    extend(mutable.args, data);
  },
  write: (current: Moss.Layer, localArgs: any) => {
    const { data, state } = next(current, localArgs);
    const options = combine(state.auto, state.stack);
    const { path, format } = options;
    switch (format) {
      case 'json':
        writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
        break;
      case 'env':
        writeFileSync(path, jsonToEnv(data), 'utf8');
        break;
      default: writeFileSync(path, yaml.dump(data), 'utf8');
    }
    return data;
  },
  stringify: (current: Moss.Layer, localArgs: any) => {
    const { data, state } = next(current, localArgs);
    const options = combine(state.auto, state.stack);
    const { format } = options;
    switch (format) {
      case 'json': default:
        return JSON.stringify(data);
    }
  },
});

const mossState = process.env.MOSS_STATE ? JSON.parse(process.env.MOSS_STATE) : {
  '$<': {},
  'select<': {}
};

export function cli() {
  switch (cliCommands[0]) {
    case 'watch':
      console.log('watching for file changes')
      cliArgs.watch = true;
      return parseCommands(cliCommands.slice(1));
  }
  return parseCommands();
}

function parseCommands(commands: string[] = cliCommands) {
  if (commands.length == 1) {
    switch (commands[0]) {
      case 'state': return console.log(chromafi(yaml.dump(mossState), chromafiOptions));
      case 'glob': return glob();
      default: run(commands[0]);
    }
  }
  if (commands.length == 2) {
    if (commands[1].indexOf('=') == -1) throw new Error('env command must stated "mosscli assign x=y"');
    const sub = commands[1].split('=');
    switch (commands[0]) {
      case 'select':
        return select(sub[0], sub[1]);
      case 'assign':
        return assign(sub[0], sub[1]);
      case 'glob':
        return glob(commands.slice(1));
      default: return console.error('unkown moss command')
    }
  } else {
    glob();
  }
}

function glob(patterns: any = '**/*.moss.yaml') {
  return _glob(patterns).then((files: string[]) => {
    each(files, (filePath) => {
      run(filePath);
    });
  });
}

function assign(name: string, val: any) {
  mossState['$<'][name] = val;
  const command = `MOSS_STATE = ${JSON.stringify(mossState)} `;
  console.log(command);
}

function select(name: string, val: any) {
  mossState['select<'][name] = val;
  const command = `MOSS_STATE = ${JSON.stringify(mossState)} `;
  console.log(command);
}

export function moss(configPath: string) {
  const runDir = process.cwd();

  const { dir, base } = path.parse(configPath);
  const configDir = path.join(runDir, dir);
  process.chdir(configDir);
  console.log('parsing', base, '@', runDir);
  mutable.args = clone(cliArgs)
  mutable.environment = <any>{};
  mutable.options = <any>{};

  each(mutable.args, (val, key) => {
    switch (key) {
      case 'outFormat': break;
      default:
        if (val == 'true' || val == 'false' || check(val, Boolean)) mutable.options[key] = val;
        else mutable.environment[key] = val;
    }
  });

  const { MOSS_STATE, ...env } = process.env;

  let configFile;
  try {
    configFile = readFileSync(base, 'utf8');
  } catch (e) {
    console.error('missing config file @', base);
    process.exit();
  }
  let config: any;
  try {
    config = yaml.load(configFile);
  } catch (e) {
    console.error('problem parsing config file', e.message);
    process.exit();
  }


  const mossCliEnv = start({
    'select<': {
      mac: platform == 'darwin',
      linux: platform == 'linux',
      win: platform == 'win32',
      ...mutable.options
    }
  });
  mossCliEnv.state.stack = { ...env, ...mutable.environment };
  const { data, state } = next(mossCliEnv, config);
  const fileName = base.split('.')[0];

  if (mutable.args.form) {
    // const json = JSON.stringify(res, null, 2);
    const form = createForm({ tree: data, namespace: fileName });
    if (mutable.args.o) {
      writeFileSync(`${fileName} Form.moss.ts`, form);
    } else {
      console.log(chromafi(form, { ...chromafiOptions, lang: 'typescript' }));
    }
  }

  if (mutable.args.dts) {
    const dts = createDts({ tree: data, namespace: fileName });
    if (mutable.args.o) {
      writeFileSync(`${fileName}.d.ts`, dts);
    } else {
      console.log(chromafi(dts, { ...chromafiOptions, lang: 'typescript' }));
    }
  }

  if (mutable.args.json) {
    const json = JSON.stringify(data, null, 2);
    if (mutable.args.o) {
      writeFileSync(`${fileName}.json`, json);
    } else {
      console.log(chromafi(json, { ...chromafiOptions, lang: 'json' }));
    }
  }

  if (mutable.args.env) {
    const env = jsonToEnv(data);
    if (mutable.args.o) {
      writeFileSync(`${fileName}.json`, env);
    } else {
      console.log(chromafi(env, { ...chromafiOptions, lang: 'json' }));
    }
  }

  const keys = Object.keys(mutable.args);
  if (mutable.args.log || !keys.length) {
    console.log(chromafi(yaml.dump(data), chromafiOptions));
  }
}

const files: any = {};
function watch(f: string, callback: Function) {
  fs.watchFile(f, { interval: 1000 }, function (c: any, p: any) {
    // Check if anything actually changed in stat
    if (files[f] && !files[f].isDirectory() && c.nlink !== 0 && files[f].mtime.getTime() == c.mtime.getTime()) return;
    files[f] = c;
    if (!files[f].isDirectory()) callback(f, c, p);
    else {
      fs.readdir(f, function (err, nfiles) {
        if (err) return;
        nfiles.forEach(function (b) {
          var file = path.join(f, b);
          if (!files[file]) {
            fs.stat(file, function (err, stat) {
              callback(file, stat, null);
              files[file] = stat;
            })
          }
        })
      })
    }
    if (c.nlink === 0) {
      // unwatch removed files.
      delete files[f]
      fs.unwatchFile(f);
    }
  });
}

function monitor(filePath: string) {
  const monitor = new EventEmitter();
  var prevFile: any = { file: null, action: null, stat: null };

  watch(filePath, function (f: any, curr: any, prev: any) {
    // if not prev and either prevFile.file is not f or prevFile.action is not created
    if (!prev) {
      if (prevFile.file != f || prevFile.action != "created") {
        prevFile = { file: f, action: "created", stat: curr };
        return monitor.emit("created", f, curr);
      }
    }

    // if curr.nlink is 0 and either prevFile.file is not f or prevFile.action is not removed
    if (curr) {
      if (curr.nlink === 0) {
        if (prevFile.file != f || prevFile.action != "removed") {
          prevFile = { file: f, action: "removed", stat: curr };
          return monitor.emit("removed", f, curr);
        }
      }
    }

    // if prevFile.file is null or prevFile.stat.mtime is not the same as curr.mtime
    if (prevFile.file === null) {
      return monitor.emit("changed", f, curr, prev);
    }
    // stat might return null, so catch errors
    try {
      if (prevFile.stat.mtime.getTime() !== curr.mtime.getTime()) {
        return monitor.emit("changed", f, curr, prev);
      }
    } catch (e) {
      return monitor.emit("changed", f, curr, prev);
    }
  });
  return monitor;
}

let emitters: any = {};

function run(configPath: string) {
  if (cliArgs.watch) {
    emitters[configPath] = monitor(configPath);
    emitters[configPath].on('changed', () => {
      moss(configPath);
    });
  } else {
    moss(configPath);
  }
}

import * as colors from 'chalk';
import * as yaml from 'js-yaml';
import * as os from 'os';
import * as minimist from 'minimist';
import { join } from 'path';
import { check, contains, each, extend, clone, combine, merge } from 'typed-json-transform';
import { readFileSync, writeFileSync } from 'fs';
import { parse, load, next, addFunctions, getFunctions } from 'js-moss';
import { exec } from 'shelljs';

const chalk = require('chalk')
const chromafi = require('chromafi')

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
  `
  return man;
}

const platform = os.platform();

const environmentArgs = <any>{};
const optionArgs = <any>{};

const cliArgs = minimist(process.argv.slice(2), { boolean: true });

addFunctions({
  cli: (current: Moss.Layer, localArgs: any) => {
    const { data, state } = next(current, localArgs);
    extend(cliArgs, data);
  },
  write: (current: Moss.Layer, localArgs: any) => {
    const { data, state } = next(current, localArgs);
    const options = combine(state.auto, state.stack);
    const { path, format } = options;
    switch (format) {
      case 'json':
        writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
        break;
      default: writeFileSync(path, yaml.dump(data), 'utf8');
    }
    return data;
  }
});

const mossState = process.env.MOSS_STATE ? JSON.parse(process.env.MOSS_STATE) : {
  '$<': {},
  'select<': {}
};

export function cli() {
  const commands = cliArgs._;
  if (commands.length == 1) {
    switch (commands[0]) {
      case 'state': return console.log(chromafi(yaml.dump(mossState), chromafiOptions));
      default: run(cliArgs);
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
      default: return console.error('unkown moss command')
    }
  }
}

function assign(name: string, val: any) {
  mossState['$<'][name] = val;
  const command = `MOSS_STATE=${JSON.stringify(mossState)}`;
  console.log(command);
}

function select(name: string, val: any) {
  mossState['select<'][name] = val;
  const command = `MOSS_STATE=${JSON.stringify(mossState)}`;
  console.log(command);
}

export function run(args: any) {
  each(args, (val, key) => {
    switch (key) {
      case '_': break;
      case 'outFormat': break;
      default:
        if (val == 'true' || val == 'false' || check(val, Boolean)) optionArgs[key] = val;
        else environmentArgs[key] = val;
    }
  });

  const { MOSS_STATE, ...env } = process.env;

  const environment = merge(mossState, {
    'select<': {
      mac: platform == 'darwin',
      linux: platform == 'linux',
      win: platform == 'win32',
      ...optionArgs
    },
    '$<': {
      ...env,
      ...environmentArgs
    }
  });

  const configPath = args._[0] || 'config.yaml';
  let configFile;
  try {
    configFile = readFileSync(configPath, 'utf8');
  } catch (e) {
    console.error('missing config file @', configPath);
    process.exit();
  }
  let config: any;
  try {
    config = yaml.load(configFile);
  } catch (e) {
    console.error('problem parsing config file', e.message);
    process.exit();
  }

  const res = parse(config, environment);
  const fileName = configPath.split('.')[0];

  if (args.form) {
    // const json = JSON.stringify(res, null, 2);
    const form = createForm({ tree: res, namespace: fileName });
    if (args.o) {
      writeFileSync(`${fileName}.ts`, form);
    } else {
      console.log(chromafi(form, { ...chromafiOptions, lang: 'typescript' }));
    }
  }

  if (args.dts) {
    const dts = createDts({ tree: res, namespace: fileName });
    if (args.o) {
      writeFileSync(`${fileName}.d.ts`, dts);
    } else {
      console.log(chromafi(dts, { ...chromafiOptions, lang: 'typescript' }));
    }
  }

  if (args.json){
    const json = JSON.stringify(res, null, 2);
    if (args.o){
      writeFileSync(`${fileName}.json`, json);
    } else {
      console.log(chromafi(json, { ...chromafiOptions, lang: 'json' }));
    }
  }

  if (!(args.json || args.dts || args.ts || args.form)){
    console.log(chromafi(yaml.dump(res), chromafiOptions));
  }
}

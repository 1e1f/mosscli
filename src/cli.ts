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

const chromafiOptions = {
  lang: 'yaml',
  colors: {
    attr: chalk.green,
    bullet: chalk.green,
    string: chalk.white,
    number: chalk.white,
    // base: chalk.bgWhite.black.bold,
    keyword: chalk.red,
    function: chalk.white,
    title: chalk.blue,
    params: chalk.white,
    built_in: chalk.blue,
    literal: chalk.blue,
    // Just pass `chalk` to ignore colors
    trailing_space: chalk,
    regexp: chalk.blue,
    // line_numbers: chalk.bgBlue.white
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

addFunctions({
  write: (current: Moss.Layer, args: any) => {
    const { data, state } = next(current, args);
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

export function cli() {
  const args = minimist(process.argv.slice(2));
  const commands = args._;
  if (commands.length == 1) {
    switch (commands[0]) {
      case 'state': return console.log(chromafi(yaml.dump(JSON.parse(process.env.MOSS_STATE)), chromafiOptions));
      default: run(args);
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
  const state = process.env.MOSS_STATE ? JSON.parse(process.env.MOSS_STATE) : {
    '$<': {},
    'select<': {}
  };
  state['$<'][name] = val;
  const command = `MOSS_STATE=${JSON.stringify(state)}`;
  console.log(command);
}

function select(name: string, val: any) {
  const state = process.env.MOSS_STATE ? JSON.parse(process.env.MOSS_STATE) : {
    '$<': {},
    'select<': {}
  };
  state['select<'][name] = val;
  const command = `MOSS_STATE=${JSON.stringify(state)}`;
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

  const environment = merge(JSON.parse(MOSS_STATE), {
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
  if (Object.keys(res).length) {
    if (args.outFormat == 'json') {
      console.log(chromafi(JSON.stringify(res, null, 2), { ...chromafiOptions, lang: 'json' }));
    } else {
      console.info(chromafi(yaml.dump(res), chromafiOptions));
    }
  }
}

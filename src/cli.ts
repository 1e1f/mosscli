import * as colors from 'chalk';
import * as yaml from 'js-yaml';
import * as os from 'os';
import * as minimist from 'minimist';
import { join } from 'path';
import { check, contains, each, extend, clone, combine } from 'typed-json-transform';
import { readFileSync, writeFileSync } from 'fs';
import { load, next, addFunctions, getFunctions } from 'js-moss';

const name = 'tmake';

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
  run(args);
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

  const environment = {
    'select<': {
      mac: platform == 'darwin',
      linux: platform == 'linux',
      win: platform == 'win32',
      ...optionArgs
    },
    '$<': {
      ...environmentArgs
    }
  };

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

  const res = load(config, environment);
  if (Object.keys(res).length) {
    if (args.outFormat == 'json') {
      console.info(JSON.stringify(res, null, 2));
    } else {
      console.info(yaml.dump(res));
    }
  }
}

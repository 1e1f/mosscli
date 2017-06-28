import * as colors from 'chalk';
import * as yaml from 'js-yaml';
import * as os from 'os';
import * as minimist from 'minimist';
import { join } from 'path';
import { check, contains, each, extend, clone, combine } from 'typed-json-transform';
import { readFileSync, writeFileSync } from 'fs';
import { load, moss, addFunctions } from 'js-moss';

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
  $write: (context: Moss.Layer, args: any) => {
    const { data, state } = moss(args, context.state);
    const { path, format } = combine(data, context.state.stack);
    switch (format || args.outFormat) {
      case 'json':
        writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
        break;
      default: writeFileSync(path, yaml.dump(data), 'utf8');
    }
    console.info('wrote', path);
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
    $options: {
      mac: platform == 'darwin',
      linux: platform == 'linux',
      win: platform == 'win32',
      ...optionArgs
    },
    $environment: {
      ...environmentArgs
    }
  };

  const configPath = args._[0] || 'config.yaml';
  let configFile;
  try {
    configFile = readFileSync(configPath, 'utf8');
  } catch (e) {
    console.error('missing config file @', configPath);
  }
  let config: any;
  try {
    config = yaml.load(configFile);
  } catch (e) {
    console.error('problem parsing config file', e.message);
  }
  console.info(load(config, environment));
}
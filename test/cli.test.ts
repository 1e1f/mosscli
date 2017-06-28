import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';
import { assert } from 'chai';

import { getFunctions } from 'js-moss';
import { run } from '../src/cli';

describe('moss', () => {
  it('extended the moss functions with $write', () => {
    assert.ok(getFunctions().$write);
  });
  it('can write files using $write function', () => {
    process.chdir(__dirname);
    const args = {
      _: ['test.yaml']
    }
    run(args);
    // const config = yaml.load(readFileSync(join(__dirname, 'config.yaml'), 'utf8'));
    // const environment = yaml.load(readFileSync(join(__dirname, 'environment.yaml'), 'utf8'));

    // const expect = yaml.load(readFileSync(join(__dirname, 'expect.yaml'), 'utf8'));

    // const result = load(config, environment);

    // assert.deepEqual(result, expect);
  });
});
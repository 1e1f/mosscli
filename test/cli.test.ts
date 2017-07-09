import { readFileSync, unlinkSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';
import { assert } from 'chai';

import { getFunctions } from 'js-moss';
import { run } from '../src/cli';

const expect: any = {
  'production.yaml': `libraryTarget: es5\n`,
  'debug.yaml': `libraryTarget: es6\n`,
  'debug.json': `{
  "libraryTarget": "es6"
}`
}

describe('moss', () => {
  it('extended the moss functions with write', () => {
    assert.ok(getFunctions().write);
  });
  it('can write files using <write function', () => {
    process.chdir(__dirname);

    Object.keys(expect).forEach(key => {
      try {
        unlinkSync(key);
      }
      catch (e) { }
    });

    const args = {
      _: ['test.yaml']
    }

    run(args);

    Object.keys(expect).forEach(key => {
      let file;
      try {
        file = readFileSync(key, 'utf8');
      }
      catch (e) {

      }
      assert.equal(file, expect[key]);
      unlinkSync(key);
    });
  });
});

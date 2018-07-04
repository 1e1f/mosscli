import { readFileSync, unlinkSync } from 'fs';
import { assert } from 'chai';

import { getFunctions } from 'js-moss';
import { moss } from '../src';

const expect: any = {
  'production.yaml': `libraryTarget: es5\n`,
  'debug.yaml': `libraryTarget: es6\n`,
  'debug.json': `{
  "libraryTarget": "es6"
}`,
  '.env.debug': `LIBRARY_TARGET=es6\n`
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

    moss('test.moss');

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

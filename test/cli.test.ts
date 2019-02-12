import { readFileSync, unlinkSync } from 'fs';
import { assert } from 'chai';
import { describe, it } from 'mocha';

import { Async } from 'js-moss';

const { getFunctions } = Async;

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

    return moss({ filePath: 'test.moss', quiet: true }).then(() => {
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
    })
  });
});

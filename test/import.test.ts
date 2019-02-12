import { describe, it } from 'mocha';
import { assert, expect } from 'chai';
import { moss } from '../src';
import * as yaml from 'js-yaml';

describe('import', () => {
  it('can resolve local files', async () => {
    process.chdir(__dirname);
    return moss({ filePath: 'part0.moss' }).then((res: any) => {
      const so = yaml.load(res);
      expect(so.hopefully.you.can.keep.your.yaml.files).to.equal('short');
    });
  });
});

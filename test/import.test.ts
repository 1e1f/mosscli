import { describe, it } from 'mocha';
import { assert, expect } from 'chai';
import { moss } from '../src';
import * as yaml from 'js-yaml';
import { Async } from 'js-moss';
import { createGraphqlResolver } from '../src/resolvers/graphql';

Async.addResolvers({
  localhost: createGraphqlResolver({
    url: 'http://localhost:3000/graphql',
    headers: {
      token: 'x'
    }
  }),
});

describe('import', () => {
  it('can resolve local files', async () => {
    process.chdir(__dirname);
    return moss({ filePath: 'part0.moss', quiet: true }).then((res: any) => {
      const so = yaml.load(res);
      expect(so.hopefully.you.can.keep.your.yaml.files).to.equal('short');
    });
  });

  it('can resolve from a graphql endpoint', async () => {
    process.chdir(__dirname);
    return moss({ filePath: 'graphql.moss', quiet: true }).then((res: any) => {
      const resolved = yaml.load(res);
      expect(resolved.graphql).to.deep.equal(resolved.expect);
    });
  });
});
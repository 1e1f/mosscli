import * as yaml from 'js-yaml';
import * as path from 'path';
import * as fs from 'fs';
import { startsWith, any } from 'typed-json-transform';

export const createFileResolver = () => ({
    match: (uri: string) => any(['/', '.', '~'], prefix => startsWith(uri, prefix)),
    resolve: async (uri: any) => {
        const ext = path.extname(uri);
        let fp = uri;
        let format = ext;
        if (!format) {
            ['moss', 'yaml', 'json'].forEach(possibleExt => {
                const possibleFilePath = `${uri}.${possibleExt}`;
                if (fs.existsSync(possibleFilePath)) {
                    format = possibleExt;
                    fp = possibleFilePath;
                }
            })
        }
        const string = fs.readFileSync(fp, 'utf8');
        let res;
        switch (format) {
            case 'json':
                res = JSON.parse(string);
                break;
            default:
                res = yaml.load(string);
                break;
        }
        return Promise.resolve(res);
    }
})
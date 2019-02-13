import * as yaml from 'js-yaml';
import * as path from 'path';
import * as fs from 'fs';
import { startsWith, any } from 'typed-json-transform';

export const resolveFileAsync = {
    match: (uri: string) => any(['/', '.', '~'], prefix => startsWith(uri, prefix)),
    resolve: (uri: any) => {
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
        return new Promise((res, rej) => {
            fs.readFile(fp, { encoding: 'utf8' }, (err, buf) => {
                if (err) rej(err);
                let data;
                switch (format) {
                    case 'json':
                        data = JSON.parse(buf);
                        break;
                    default:
                        data = yaml.load(buf);
                        break;
                }
                return res({
                    path: uri,
                    buf,
                    data
                });
            });
        });
    }
}
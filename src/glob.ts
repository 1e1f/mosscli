import * as path from 'path';
import globAll = require('glob-all');
import { check, map } from 'typed-json-transform';

const defaultCwd = process.cwd();

function _glob(srcPattern: string[], relative: string = defaultCwd, cwd: string = defaultCwd) {
    return new Promise<string[]>((resolve: Function, reject: Function) => {
        return globAll(srcPattern,
            {
                cwd: cwd,
                root: relative,
                nonull: false
            },
            (err: Error, results: string[]) => {
                if (err) {
                    reject(err);
                } else if (results) {
                    resolve(map(results, (file: string) => {
                        const filePath = path.join(cwd, file);
                        if (relative) {
                            return path.relative(relative, filePath);
                        }
                        return filePath;
                    }));
                }
                reject('no files found');
            });
    });
}

export function glob(_patterns: any, relative?: string, cwd?: string) {
    let patterns: string[] = [];
    if (check(_patterns, String)) {
        patterns.push(_patterns);
    } else if (check(_patterns, Array)) {
        patterns = _patterns;
    }
    return _glob(patterns, relative, cwd);
};
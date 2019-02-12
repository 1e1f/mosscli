import fetch from 'node-fetch';
import { load } from 'js-yaml';
import { colorLog } from '../util';

interface Endpoint {
    url: string
    headers: {
        [x: string]: string
    }
};

import { createFileResolver } from './file';

const fileResolver = createFileResolver();

export const createGraphqlResolver = (endpoint: Endpoint) => ({
    match: (uri: string) => !fileResolver.match(uri) && uri.indexOf('/') != -1,
    resolve: async (uri: string) => {
        const query = `{
            fromUri(uri: "${uri}") {
                _id,
                path,
                text
            }
        }`;

        const response = await fetch(
            endpoint.url, {
                method: 'POST',
                headers: {
                    ...endpoint.headers,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query
                }),
            })

        const res = await response.json();
        if (res) {
            if (res.data) {
                const branch: any = res.data.fromUri;
                if (branch) {
                    const { text } = branch;
                    if (text) {
                        return load(text);
                    }
                }
            }
            if (res.errors) {
                colorLog('json', res.errors);
            }
        }
        return null;
    }
});
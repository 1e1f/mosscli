const chalk = require('chalk');
const chromafi = require('chromafi');

export const chromafiOptions = {
    lang: 'yaml',
    colors: {
        attr: chalk.green,
        bullet: chalk.green,
        string: chalk.white,
        number: chalk.white,
        base: chalk.white,
        keyword: chalk.green,
        function: chalk.white,
        // title: chalk.red,
        params: chalk.white,
        built_in: chalk.green,
        literal: chalk.green,
        class: chalk.green,
        // regexp: chalk.red,
    }
};

export const colorLog = (lang: string, args: any) => console.log(chromafi(args, { ...chromafiOptions, lang }));
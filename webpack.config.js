import * as path from 'path';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    entry: './src/index.js',
    output: {
        filename: 'index.js',
        library: {
            name:'@qikdev/sdk',
            type:'umd',
        },
        path: path.resolve(__dirname, 'dist'),
        globalObject: 'typeof self !== \'undefined\' ? self : this',
    },
    optimization: {
        // splitChunks: {
        // chunks: 'all'
        // }
    },
    externals: {
        'axios': {
            commonjs: 'axios',
            commonjs2: 'axios',
            amd: 'axios',
            root: 'axios'
        },
        'lodash': {
            commonjs: 'lodash',
            commonjs2: 'lodash',
            amd: 'lodash',
            root: '_'
        },
        'axios-extensions': {
            commonjs: 'axios-extensions',
            commonjs2: 'axios-extensions',
            amd: 'axios-extensions',
            root: 'axios-extensions'
        }
    },
    // output: {
    //   filename: 'main.js',
    //   path: path.resolve(__dirname, 'dist')
    // }
};
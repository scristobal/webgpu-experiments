const { config } = require('@swc/core/spack');

/** @type {import('@swc/core').SpackConfig} */
module.exports = config({
    name: 'web',
    entry: {
        web: __dirname + '/src/index.ts',
    },
    output: {
        path: __dirname + '/lib',
        name: 'index.js',
    },
    module: {},
});

const config = {
    entry: {
        tes: './src/tes.ts',
        background: './src/background.ts',
        options: './src/options.ts'
    },
    output: {
        filename: '[name].js',
        path: __dirname + '/build',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    }
}

module.exports = (env , argv) => {
    if (argv.mode === 'development') {
        config.devtool = 'eval-source-map'
    }
    return config
}

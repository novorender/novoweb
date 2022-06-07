module.exports = {
    webpack: {
        configure: (webpackConfig, { env, paths }) => {
            webpackConfig.externals = {
                "@novorender/webgl-api": "self.NovoRender",
                "@novorender/measure-api": "self.NovoMeasure",
            };
            return webpackConfig;
        },
    },
};

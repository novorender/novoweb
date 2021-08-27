module.exports = {
    webpack: {
        configure: (webpackConfig, { env, paths }) => {
            webpackConfig.externals = {
                "@novorender/webgl-api": "self.NovoRender",
            };
            return webpackConfig;
        },
    },
};

requirejs.config({
    baseUrl: 'libs',
    paths: {
        app: '../js/app'
    }
});
requirejs(['app/main']);
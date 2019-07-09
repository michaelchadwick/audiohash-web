/* global requirejs */

requirejs.config({
  baseUrl: 'lib',
  paths: {
    jquery: 'jquery',
    popper: 'popper',
    bootstrap: 'bootstrap.min',
    fontawesome: 'fontawesome',
    app: './assets/js/app',
  }
})

// Start loading the main app file. Put all of
// your application logic in there.
requirejs(['app/main'])
/* global requirejs */

requirejs.config({
  baseUrl: 'vendor',
  paths: {
    jquery: 'jquery.min',
    popper: 'popper.min',
    bootstrap: 'bootstrap.min',
    fontawesome: 'fontawesome',
    app: '../assets/js/app',
  }
})

console.log('set requirejs config')

// Start loading the main app file. Put all of
// your application logic in there.
requirejs(['app/main'])
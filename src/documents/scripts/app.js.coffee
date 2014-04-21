### cson
standalone: true
browserify:
	ignore: ['backbone', 'exoskeleton', 'underscore', 'jquery']
###

# Import
$ = window.$
{App} = require('./views/app')


# Create Application
window.app = app = new App(
	el: $('.app')
)
$(window)
	.on('resize', app.onWindowResize.bind(app))
	.on('message', app.onMessage.bind(app))

# Setup Debug Entry Point
window.debug = ->
	debugger

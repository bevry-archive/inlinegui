### cson
standalone: true
browserify:
	ignore: ['backbone', 'exoskeleton', 'underscore', 'jquery']
###

# Only run if we are inside the iframe
return  if parent is self

# TODO:
# - track dirty state
# - track changes
# - add dirty classname when dirty

# Import
{TaskGroup} = require('taskgroup')
dominject = require('dominject')
{wait, waiter, sendMessage} = require('./util')

# Define our application
class App

	# Load the application
	load: (opts, next) ->
		new TaskGroup(
			concurrency: 0
			tasks: [
				(complete) -> dominject(
						type: 'script'
						url: '//cdnjs.cloudflare.com/ajax/libs/ckeditor/4.2/ckeditor.js'
						next: complete
					)
			]
			next: next
		).run()

	# What to do once the application has loaded
	loaded: (opts, next) ->
		# Add the activated class
		document.body.className += ' inlinegui-actived'

		# Editables
		editables = document.getElementsByClassName('inlinegui-editable')

		for editable in editables
			editable.setAttribute('contenteditable', true)

		if CKEDITOR?
			CKEDITOR.disableAutoInline = true
			[].slice.call(editables).forEach (editable) ->
				editor = CKEDITOR.inline(editable)
				editor.on 'change', ->
					sendMessage(
						action: 'change'
						url: editable.getAttribute('about')
						attribute: editable.getAttribute('property')
						value: editor.getData()
					)

		# Notify the parent we've loaded
		sendMessage(
			action: 'childLoaded'
			height: document.body.scrollHeight
		)

		# Resize ourselves in the parent
		waiter 100, ->
			sendMessage(
				action: 'resizeChild',
				height: document.body.scrollHeight
			)

		# Loaded
		next?()

# Start the application
window.onload = ->
	app = new App()
	app.load {}, (err) ->
		throw err  if err
		app.loaded {}, (err) ->
			throw err  if err

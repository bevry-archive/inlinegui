class View
	events: null
	elements: null
	el: null
	$el: null

	constructor: (opts) ->
		@events ?= {}
		@elements ?= {}

		@setConfig(opts)

		@refreshElement()
		@refreshElements()
		@refreshEvents()

	refreshElement: (el=null) ->
		@el = el ? @el
		@$el = $(@el)
		@el = @$el.get(0)
		@

	$: (selector) ->
		return @[selector] ? $(selector, @$el)

	setConfig: (opts={}) ->
		for own key,value of opts
			@[key] = value
		@

	refreshEvents: (opts={}) ->
		opts.bind = true
		for own key,value of @events
			split = key.indexOf(' ')
			eventName = key.substr 0, split
			selector = key.substr split+1
			eventMethod = @[value]

			# use live events
			@$el.off(eventName, selector, eventMethod)
			@$el.on(eventName, selector, eventMethod)	if opts.bind is true
		@

	refreshElements: ->
		for own selector,elementName of @elements
			@[elementName] = $(selector, @$el)
		@

	destroy: ->
		@refreshEvents(bind: false)
		@$el.remove()
		@el = @$el = null
		@

module.exports = {View}
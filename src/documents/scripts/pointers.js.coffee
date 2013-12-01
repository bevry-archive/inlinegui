# =====================================
## Pointers

extendr = require('extendr')

class Pointer
	config: null
	bound: false
	bindTimeout: null

	constructor: (item) ->
		@config ?= {}

		type = if item.length? then 'collection' else 'model'

		@setConfig(
			type: type
			item: item
		)

		@bindTimeout = setTimeout(@bind, 0)

		@

	bind: =>
		(clearTimeout(@bindTimeout); @bindTimeout = null)  if @bindTimeout
		return @  if @bound is true
		@bound = true

		@config.element.data('pointer')?.destroy()
		@config.element.data('pointer', @)

		@unbind()

		if @config.type is 'model'
			if @config.attributes
				@config.handler ?= @defaultModelHandler
				@config.item.on('change:'+attribute, @changeAttributeHandler)  for attribute in @config.attributes
				@changeAttributeHandler(@config.model, null, {})
				if @config.update is true
					@config.element.on('change', @updateHandler)

			if @config.Controller
				@createControllerViaModel(@config.item)

		else
			if @config.Controller
				@config.handler ?= @defaultCollectionHandler
				@config.element.off('change', @updateHandler)
				@config.item
					.on('add',    @addHandler)
					.on('remove', @removeHandler)
					.on('reset',  @resetHandler)
				@resetHandler(@config.item.models, @config.item, {})
		@

	unbind: =>
		(clearTimeout(@bindTimeout); @bindTimeout = null)  if @bindTimeout
		return @  if @bound is false
		@bound = false

		@config.item.off('change:'+attribute, @changeAttributeHandler)  for attribute in @config.attributes  if @config.attributes
		@config.item
			.off('add',    @addHandler)
			.off('remove', @removeHandler)
			.off('reset',  @resetHandler)
		@

	destroy: (opts) =>
		@unbind()
		if @config.type is 'collection'
			@config.element.children().each ->
				$el = $(@)
				if $el.data('controller')?.destroy()
					$el.remove()
		#@config.element.remove()
		@

	setConfig: (config={}) ->
		for own key,value of config
			@config[key] = value
		@


	updateHandler: (e) =>
		attrs = {}
		attrs[@config.attributes[0]] = @config.element.val()
		@config.item.set(attrs)
		@

	addHandler: (model, collection, opts) =>
		@callUserHandler extendr.extend(opts, {event:'add', model, collection})
	removeHandler: (model, collection, opts) =>
		@callUserHandler extendr.extend(opts, {event:'remove', model, collection})
	resetHandler: (collection, opts) =>
		@callUserHandler extendr.extend(opts, {event:'reset', collection})
	changeAttributeHandler: (model, value, opts) =>
		value ?= @fallbackValue()
		@callUserHandler extendr.extend(opts, {event:'change', model, value})

	callUserHandler: (opts) =>
		opts.$el = @config.element
		opts[@config.type] = @config.item
		opts.item = @config.item
		@config.handler(opts)
		return true

	defaultModelHandler: ({$el, value}) =>
		value ?= @fallbackValue()
		if $el.is(':input')
			$el.val(value)
		else
			$el.text(value)
		return true

	createControllerViaModel: (model) =>
		model ?= @config.item

		controller = new @config.Controller(item: model)

		controller.$el
			.data('controller', controller)
			.data('model', model)
			.addClass("model-#{model.cid}")

		controller
			.render()
			.appendTo(@config.element)

		return controller

	destroyControllerViaElement: (element) =>
		$el = element
		if $el.data('controller')?.destroy()
			$el.remove()
		@

	defaultCollectionHandler: (opts) =>
		{model, event, collection} = opts
		switch event
			when 'add'
				@createControllerViaModel(model)

			when 'remove'
				$el = @getModelElement(model)
				@destroyControllerViaElement($el)

			when 'reset'
				@config.element.children().each =>
					@destroyControllerViaElement $(@)

				for model in collection.models
					@createControllerViaModel(model)

		return true

	fallbackValue: ->
		value = null
		for attribute in @config.attributes
			if (value = @config.item.get(attribute))
				break
		return value

	getModelElement: (model) =>
		return @config.element.find(".model-#{model.cid}:first") ? null
	getModelController: (model) =>
		return @getModelElement(model)?.data('controller') ? null

	getElement: =>
		return @getModelElement(@config.item)
	getController: =>
		return @getElement().data('controller')

	update: ->
		update = true
		@setConfig({update})
		@

	attributes: (attributes...) ->
		@setConfig({attributes})
		@

	controller: (Controller) ->
		@setConfig({Controller})
		@

	using: (handler) ->
		@setConfig({handler})
		@

	to: (element) ->
		@setConfig({element})
		@

# Exports
module.exports = {Pointer}
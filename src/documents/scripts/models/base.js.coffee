# Import
Backbone = window.Backbone
queryEngine = require('query-engine')
{wait, thrower, extractData, ignoreSync} = require('../util')
{TaskGroup} = require('taskgroup')


# Define the Base Model that uses Backbone.js
class Model extends window.Backbone.Model

	syncing: null
	synced: null
	ignoreSync: ignoreSync

	getSyncUrl: ->
		throw new Error('should be implemented by the inheriting model')

	parse: (response) ->
		data = extractData(response)
		return data

	sync: (opts={}, next) ->
		next ?= thrower.bind(@)

		if @ignoreSync(opts)
			console.log 'sync ignored', @, opts
			next()

		else
			console.log 'sync performing', @, opts

			@syncing = true
			@synced  = new Date()
			isNew = @isNew()

			opts.method ?= if isNew then 'put' else 'post'
			opts.data ?= @toJSON()  if opts.method isnt 'destroy'
			opts.url ?= @getSyncUrl()

			app.request opts, (err, data) =>
				return next(err)  if err

				if opts.method isnt 'destroy'
					@set @parse(data)
					@trigger('sync', @, data, opts);

				@syncing = false

				return next()

		@

	fetch: (opts={}, next) ->
		next ?= thrower.bind(@)
		opts.method ?= 'fetch'
		opts.sync ?= true
		@sync(opts, next)  if opts.sync is true
		@

	save: (opts={}, next) ->
		next ?= thrower.bind(@)
		opts.method ?= 'save'
		opts.sync ?= true
		@sync(opts, next)  if opts.sync is true
		@

	destroy: (opts={}, next) ->
		next ?= thrower.bind(@)
		opts.method ?= 'destroy'
		opts.sync ?= false
		@trigger('destroy', @, @collection, opts)
		@sync(opts, next)  if opts.sync is true
		@


# Define the Base Collection that uses QueryEngine.
# QueryEngine adds NoSQL querying abilities to our collections
class Collection extends queryEngine.QueryCollection
	collection: Collection

	syncing: null
	synced: null
	ignoreSync: ignoreSync

	fetchItem: (opts={}, next) ->
		next ?= thrower.bind(@)

		# Check for existance by id
		slug = opts.item.get?('slug') or opts.item
		result = @get(slug)
		if result
			return next(null, result)

		# We don't have it, so let's sync and try again
		else
			wait 1000, => @sync {}, (err) =>
				return next(err)  if err
				return @fetchItem(opts, next)

		# Chain
		@

	sync: (opts={}, next) ->
		next ?= thrower.bind(@)

		if @ignoreSync(opts)
			console.log 'sync ignored', @, opts
			next()

		else
			console.log 'sync performing', @, opts

			key = @getLocalStorageKey()

			if opts.method is 'create'
				console.log 'Create model in collection', @, opts, opts.model

				# Instantiate
				opts.model = @_prepareModel(opts.model, opts)
				unless opts.model
					err = new Error('Model creation failed')
					return next(err)

				# Save
				opts.model.save opts, (err) =>
					# Add
					return next(err)  if err
					@add(opts.model)

					# Save
					opts.method = 'save'
					@sync(opts, next)

			else if opts.method is 'fetch'
				items = JSON.parse(localStorage.getItem(key) or 'null') or []
				models = []

				console.log 'Fetch models in collection', @, opts, items

				tasks = new TaskGroup concurrency: 0, next: (err) =>
					# Add
					return next(err)  if err
					@add(models)
					console.log 'Added models to the collection', @, opts, models, @.length

					# Save
					opts.method = 'save'
					@sync(opts, next)

				items.forEach (item, index) =>
					tasks.addTask (complete) =>
						item.id = index  # give it an id so that collection sync fires when destroying the item
						model = new @model(item).fetch({}, complete)
						models.push(model)

				tasks.run()

			else if opts.method is 'save'
				items = JSON.stringify(@toJSON())
				console.log 'Save models in collection', @, opts, items
				localStorage.setItem(key, items)
				next()

			else
				err = new Error('Unknown sync method')
				next(err)

		@

	fetch: (opts={}, next) ->
		next ?= thrower.bind(@)
		opts.method ?= 'fetch'
		opts.sync ?= true
		@sync(opts, next)  if opts.sync is true
		@

	save: (opts={}, next) ->
		next ?= thrower.bind(@)
		opts.method ?= 'save'
		opts.sync ?= true
		@sync(opts, next)  if opts.sync is true
		@

	create: (model, opts={}, next) ->
		next ?= thrower.bind(@)
		opts.method ?= 'create'
		opts.model = model
		opts.sync ?= true
		@sync(opts, next)  if opts.sync is true
		@

# Export
module.exports = {Model, Collection}

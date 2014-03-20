# Import
_ = window._
{Model, Collection} = require('./base')
{File} = require('./file')
{CustomFileCollection} = require('./customfilecollection')
{TaskGroup} = require('taskgroup')
{thrower, slugify, wait} = require('../util')

# Model
class Site extends Model
	defaults:
		name: null
		slug: null
		url: null
		token: null
		customFileCollections: null  # Collection of CustomFileCollection Models
		files: null  # FileCollection Model

	sync: (opts={}, next) ->
		next ?= thrower.bind(@)

		if @ignoreSync(opts)
			console.log 'sync ignored', @, opts
			next()

		else
			console.log 'sync performing', @, opts

			if opts.method is 'destroy'
				next()

			else
				site = @
				siteUrl = site.get('url')
				siteToken = site.get('token')

				result = {}

				# Do our ajax requests in parallel
				tasks = new TaskGroup concurrency: 0, next: (err) =>
					return next(err)  if err
					console.log 'site model fetched', @, opts, result
					@set @parse(result)
					return next()

				# Fetch all the collections
				tasks.addTask (complete) =>
					app.request {url: "#{siteUrl}/restapi/collections/?securityToken=#{siteToken}"}, (err, data) =>
						return complete(err)  if err
						result.customFileCollections = data
						return complete()

				# Fetch all the files
				tasks.addTask (complete) =>
					app.request {url: "#{siteUrl}/restapi/files/?securityToken=#{siteToken}"}, (err, data) =>
						return complete(err)  if err
						result.files = data
						return complete()

				# Run our tasks
				tasks.run()

		@

	get: (key) ->
		switch key
			when 'name'
				@get('url').replace(/^.+?\/\//, '')
			when 'slug'
				slugify @get('name')
			else
				super

	getCollection: (name) ->
		return @get('customFileCollections').findOne({name})

	getCollectionFiles: (name) ->
		return @getCollection(name)?.get('files')

	toJSON: ->
		return _.omit(super(), ['customFileCollections', 'files'])

	parse: ->
		# Prepare
		site = @
		data = super

		if Array.isArray(data.customFileCollections)
			# Add the site to each site collection
			for collection in data.customFileCollections
				collection.site = site

			# Add the site custom file collections to the global collection
			CustomFileCollection.collection.add(data.customFileCollections, {parse:true})

			# Ensure it doesn't overwrite our live collection
			delete data.customFileCollections

		if Array.isArray(data.files)
			# Add the site to each site file
			for file in data.files
				file.site = @

			# Add the site files to the global collection
			File.collection.add(data.files, {parse:true})

			# Ensure it doesn't overwrite our live collection
			delete data.files

		# Return the data
		return data

	initialize: ->
		super

		# Create a live updating collection inside of us of all the FileCollection Models that are for our site
		@attributes.customFileCollections ?= CustomFileCollection.collection.createLiveChildCollection().setQuery('Site Limited',
			site: @
		).query()

		# Create a live updating collection inside of us of all the File Models that are for our site
		@attributes.files ?= File.collection.createLiveChildCollection().setQuery('Site Limiter',
			site: @
		).query()

		# Fetch the latest from the server
		# @fetch()

		# Chain
		@

# Collection
class Sites extends Collection
	model: Site
	collection: Sites

	getLocalStorageKey: -> 'sites'

	constructor: ->
		super
		@on 'remove', (model) =>
			console.log 'remove site from collection', @, model
			@sync()

	get: (id) ->
		item = super or @findOne(
			$or:
				slug: id
				name: id
		)
		return item

# Instantiate the global collection of sites
Site.collection = new Sites([], {
	name: 'Global Site Collection'
})

# Export
module.exports = {Site, Sites}

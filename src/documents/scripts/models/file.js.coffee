# Import
_ = window._
{Model, Collection} = require('./base')
{safe, slugify, extractData, extractSyncOpts} = require('../util')

# Model
class File extends Model
	default:
		slug: null
		filename: null
		relativePath: null
		url: null
		urls: null
		contentType: null
		encoding: null
		content: null
		contentRendered: null
		source: null

		title: null
		layout: null
		author: null
		site: null  # The model of the site this is for

	constructor: ->
		@metaAttributes ?= ['title', 'content', 'date', 'author', 'layout']
		super

	get: (key) ->
		switch key
			when 'slug'
				slugify @get('relativePath')
			else
				super

	sync: (args...) ->
		opts = extractSyncOpts(args)

		#console.log 'file sync', opts

		file = @
		fileRelativePath = file.get('relativePath')
		site = file.get('site')
		siteUrl = site.get('url')
		siteToken = site.get('token')

		if opts.method isnt 'delete'
			opts.data ?= _.pick(file.toJSON(), @metaAttributes)
		opts.method ?= if @isNew() then 'put' else 'post'
		opts.url ?= "#{siteUrl}/restapi/collection/database/#{fileRelativePath}?securityToken=#{siteToken}"

		app.request opts, (err, data) =>
			return safe(opts.next, err)  if err

			@set @parse(data)

			safe(opts.next, null, @)

		@

	reset: ->
		data = {}
		for own key,value of @attributes
			data[key] = null
		for own key,value of @lastSync
			data[key] = value
		@set(data)
		@

	toJSON: ->
		return _.omit(super(), ['site'])

	parse: (response, opts) ->
		# Prepare
		data = extractData(response)

		# Apply meta directly
		for own key,value of data.meta
			data[key] = value
		delete data.meta

		# Fix date
		data.date = new Date(data.date)  if data.date

		# Store data
		@lastSync = data

		# Apply the received data to the model
		return data

	initialize: ->
		super

		# Apply id
		@id ?= @cid

		# Chain
		@

# Collection
class Files extends Collection
	model: File
	collection: Files

	get: (id) ->
		item = super or @findOne(
			$or:
				slug: id
				relativePath: id
		)
		return item

# Instantiate the global collection of custom file collections
File.collection = new Files([], {
	name: 'Global File Collection'
})

# Export
module.exports = {File, Files}
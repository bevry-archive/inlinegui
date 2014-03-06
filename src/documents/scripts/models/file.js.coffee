# Import
_ = window._
{Model, Collection} = require('./base')
{slugify} = require('../util')

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

	getSyncUrl: ->
		file = @
		fileRelativePath = file.get('relativePath')
		site = file.get('site')
		siteUrl = site.get('url')
		siteToken = site.get('token')

		return "#{siteUrl}/restapi/collection/database/#{fileRelativePath}?securityToken=#{siteToken}"

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

	parse: ->
		# Prepare
		data = super

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
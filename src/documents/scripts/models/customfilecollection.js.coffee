# Import
_ = window._
{Model, Collection} = require('./base')
{File} = require('./file')
{slugify} = require('../util')

# Model
class CustomFileCollection extends Model
	defaults:
		name: null
		relativePaths: null  # Array of the relative paths for each file in this collection
		files: null  # A live updating collection of files within this collection
		site: null  # The model of the site this is for

	get: (key) ->
		switch key
			when 'slug'
				slugify @get('name')
			else
				super

	toJSON: ->
		return _.omit(super(), ['files', 'site'])

	getSyncUrl: ->
		site = @get.get('site')
		siteUrl = site.get('url')
		siteToken = site.get('token')
		collectionName = @get('name')
		return "#{siteUrl}/restapi/collection/#{collectionName}/?securityToken=#{siteToken}"

	initialize: ->
		super

		# Create a live updating collection inside of us of all the File Models that are for our site and colleciton
		@attributes.files ?= File.collection.createLiveChildCollection()

		# Update Query
		@updateQuery()  if @attributes.relativePaths
		@on('change:relativePaths', @updateQuery.bind(@))

		# Chain
		@

	updateQuery: ->
		query =
			site: @get('site')
			relativePath: $in: @get('relativePaths')
		@attributes.files.setQuery('CustomFileCollection Limiter', query).query()
		@


# Collection
class CustomFileCollections extends Collection
	model: CustomFileCollection
	collection: CustomFileCollections

	get: (id) ->
		item = super or @findOne(
			$or:
				slug: id
				name: id
		)
		return item

# Instantiate the global collection of custom file collections
CustomFileCollection.collection = new CustomFileCollections([], {
	name: 'Global CustomFileCollection Collection'
})

# Export
module.exports = {CustomFileCollection, CustomFileCollections}

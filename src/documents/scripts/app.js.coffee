###
standalone: true
###

# Inline GUI

# =====================================
## Prepare

# Helpers
wait = (delay,fn) -> setTimeout(fn,delay)
safe = (next, err, args...) ->
	return next(err, args...)  if next
	throw err  if err
	return
slugify = (str) ->
	str.replace(/[^:-a-z0-9\.]/ig, '-').replace(/-+/g, '')
extractData = (response) ->
	data = response
	data = JSON.parse(data)  if typeof data is 'string'
	data = data.data  if data.data?
	return data
extractSyncOpts = (args) ->
	# Extract sync arguments
	if args.length is 3
		opts = args[2] or {}
		opts.method = args[0]
	else
		opts = args[0]
		opts.next ?= args[1] or null
	return opts

# Import
moment = require('moment')
QueryEngine = require('query-engine')
{Task, TaskGroup} = require('taskgroup')
{Pointer} = require('./pointers')
{View} = require('./view')
{Model} = window.Backbone
{Route} = require('./route')


# =====================================
## Models

# Define the Base Model that uses Backbone.js

class Model extends Model


# Define the Base Collection that uses QueryEngine.
# QueryEngine adds NoSQL querying abilities to our collections

class Collection extends QueryEngine.QueryCollection
	collection: Collection

	fetchItem: (opts={}, next) ->
		opts.next ?= next  if next

		opts.item = opts.item.get?('slug') or opts.item

		#console.log("Fetching", opts.item, "from", @options.name or @)

		result = @get(opts.item)
		return safe(opts.next, null, result)  if result

		wait 1000, =>
			#console.log "Couldn't fetch the item, trying again"
			@fetchItem(opts)

		@

# -------------------------------------
# Site

# Model
class Site extends Model
	defaults:
		name: null
		slug: null
		url: null
		token: null
		customFileCollections: null  # Collection of CustomFileCollection Models
		files: null  # FileCollection Model

	fetch:  (opts={}, next) ->
		opts.next ?= next  if next

		#console.log 'model fetch', opts

		site = @
		siteUrl = site.get('url')
		siteToken = site.get('token')

		result = {}

		# Do our ajax requests in parallel
		tasks = new TaskGroup(concurrency: 0).once 'complete', (err) =>
			return next(err)  if err
			@set @parse(result)
			return next()

		# Fetch all the collections
		tasks.addTask (complete) =>
			app.request url: "#{siteUrl}/restapi/collections/?securityToken=#{siteToken}", next: (err, data) =>
				return complete(err)  if err
				result.customFileCollections = data
				return complete()

		# Fetch all the files
		tasks.addTask (complete) =>
			app.request url: "#{siteUrl}/restapi/files/?securityToken=#{siteToken}", next: (err, data) =>
				return complete(err)  if err
				result.files = data
				return complete()

		# Run our tasks
		tasks.run()

		@

	sync: (args...) ->
		opts = extractSyncOpts(args)
		console.log 'model sync', opts
		Site.collection.sync(opts)
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

	parse: (response, opts={}) ->
		# Prepare
		site = @
		data = extractData(response)

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

	fetch: (opts={}, next) ->
		opts.next ?= next  if next

		#console.log 'collection fetch', opts
		sites = JSON.parse(localStorage.getItem('sites') or 'null') or []

		tasks = new TaskGroup concurrency: 0, next: (err) =>
			@add(sites)
			safe(opts.next, err, @)

		sites.forEach (site, index) ->
			tasks.addTask (complete) ->
				site.id = index  # give it an id so that collection sync fires when destroying the item
				sites[index] = new Site(site).fetch({}, complete)

		tasks.run()

		@

	sync: (args...) ->
		opts = extractSyncOpts(args)
		console.log 'collection sync', opts
		opts.success?()  # destroy it
		wait 0, =>  # wait for colleciton remote events to fire
			sites = JSON.stringify(@toJSON())
			localStorage.setItem('sites', sites)
			safe(opts.next, null, @)
		@

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

# Expose
window.Site = Site


# -------------------------------------
# Custom File Collections

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

	url: ->
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

# Expose
window.CustomFileCollection = CustomFileCollection


# -------------------------------------
# Files

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

# Expose
window.File = File


# =====================================
## Controllers/Views

class Controller extends View
	point: (args...) ->
		pointer = new Pointer(args...)
		(@pointers ?= []).push(pointer)
		return pointer

	destroy: ->
		pointer.destroy()  for pointer in @pointers  if @pointers
		@pointers = null
		return super

	navigate: (args...) ->
		return Route.navigate.apply(Route, args)

class FileEditItem extends Controller
	el: $('.page-edit').remove().first().prop('outerHTML')

	elements:
		'.field-title  :input': '$title'
		'.field-date   :input': '$date'
		'.field-author :input': '$author'
		'.field-layout :input': '$layout'
		'.page-source  :input': '$source'
		'.page-preview': '$previewbar'
		'.page-source':  '$sourcebar'
		'.page-meta':    '$metabar'

	getCollectionSelectValues: (collectionName) ->
		{item} = @
		selectValues = []
		selectValues.push $ '<option>',
			text: 'None'
			value: ''
		for model in item.get('site').getCollectionFiles(collectionName)?.models or []
			selectValues.push $ '<option>',
				text: model.get('title') or model.get('name') or model.get('relativePath')
				value: model.get('relativePath')
		return selectValues

	getOtherSelectValues: (fieldName) ->
		{item} = @
		selectValues = _.uniq item.get('site').get('files').pluck(fieldName)
		return selectValues

	render: =>
		# Prepare
		{item, $el, $source, $date, $title, $layout, $author, $previewbar, $source} = @

		# Apply
		$author.empty().append(
			@getCollectionSelectValues('authors').concat @getOtherSelectValues('author')
		)
		$layout.empty().append(
			@getCollectionSelectValues('layouts').concat @getOtherSelectValues('author')
		)

		@point(item).attributes('layout').to($layout).bind()
		@point(item).attributes('author').to($author).bind()
		@point(item).attributes('source').to($source).bind()
		@point(item).attributes('title', 'name', 'filename').to($title).update().bind()

		@point(item)
			.attributes('url')
			.to($previewbar)
			.using ({$el, item}) ->
				$el.attr('src': item.get('site').get('url')+item.get('url'))
			.bind()

		@point(item)
			.attributes('date')
			.to($date)
			.using ({$el, value}) ->
				if value?
					$el.val moment(value).format('YYYY-MM-DD')
			.bind()

		# Editor
		@editor = CodeMirror.fromTextArea($source.get(0), {
			mode: item.get('contentType')
		})

		# Chain
		@

	cancel: (opts={}, next) ->
		opts.next ?= next  if next
		@item.reset(opts)
		opts.next?()
		@

	save: (opts={}, next) ->
		opts.next ?= next  if next
		@item.sync(opts)
		@

class FileListItem extends Controller
	el: $('.content-table.files .content-row:last').remove().first().prop('outerHTML')

	elements:
		'.content-name': '$title'
		'.content-cell-tags': '$tags'
		'.content-cell-date': '$date'

	render: =>
		# Prepare
		{item, $el, $title, $tags, $date} = @

		# Apply
		@point(item)
			.attributes('title', 'name', 'relativePath')
			.to($title)
			.using ({$el, item}) ->
				title = item.get('title') or item.get('name')
				relativePath = item.get('relativePath')
				if title
					$el.text(title)
					$el.append('<br>'+relativePath)
				else
					$el.text(relativePath)
			.bind()

		@point(item)
			.attributes('tags')
			.to($tags)
			.using ({$el, value}) ->
				$el.text (value or []).join(', ') or ''
			.bind()

		@point(item)
			.attributes('date')
			.to($date)
			.using ({$el, value}) ->
				$date.text value?.toLocaleDateString() or ''
			.bind()

		# Chain
		@

class SiteListItem extends Controller
	el: $('.content-table.sites .content-row:last').remove().first().prop('outerHTML')

	elements:
		'.content-name': '$name'

	render: =>
		# Prepare
		{item, $el, $name} = @

		# Apply
		$name.text item.get('name') or item.get('url') or ''

		# Chain
		@


class App extends Controller
	# ---------------------------------
	# Constructor

	elements:
		'.loadbar': '$loadbar'
		'.menu': '$menu'
		'.menu .link': '$links'
		'.menu .toggle': '$toggles'
		'.link-site': '$linkSite'
		'.link-page': '$linkPage'
		'.toggle-preview': '$togglePreview'
		'.toggle-meta': '$toggleMeta'
		'.collection-list': '$collectionList'
		'.content-table.files': '$filesList'
		'.content-table.sites': '$sitesList'
		'.content-row-file': '$files'
		'.content-row-site': '$sites'
		'.page-edit-container': '$pageEditContainer'

	events:
		'click .sites .content-cell-name': 'clickSite'
		'click .files .content-cell-name': 'clickFile'
		'change .collection-list': 'clickCollection'
		'click .menu .link': 'clickMenuLink'
		'click .menu .toggle': 'clickMenuToggle'
		'click .menu .button': 'clickMenuButton'
		'click .button-login': 'clickLogin'
		'click .button-add-site': 'clickAddSite'
		'submit .site-add-form': 'submitSite'
		'click .site-add-form .button-cancel': 'submitSiteCancel'

	constructor: ->
		# Super
		super

		# Ensure that the change event is fired as soon as they've clicked the option
		@$el.on 'click', '.collection-list', (e) ->
			$(e.target).blur()

		# Clean
		@$sites.remove()
		@$files.remove()

		# Update the site listing
		@point(Site.collection).controller(SiteListItem).to(@$sitesList).bind()

		# Apply
		@onWindowResize()
		@setAppMode('login')

		# Login
		currentUser = localStorage.getItem('currentUser') or null
		navigator.id?.watch(
			loggedInUser: currentUser
			onlogin: (args...) ->
				# ignore as we listen to post message
			onlogout: ->
				localStorage.setItem('currentUser', '')
		)

		# Login the user if we already have one
		@loginUser(currentUser)  if currentUser

		# Fetch our site data
		wait 0, =>
			Site.collection.fetch next: =>
				# Bind routes
				routes =
					'/': 'routeApp'
					'/site/:siteId/': 'routeApp'
					'/site/:siteId/:fileCollectionId': 'routeApp'
					'/site/:siteId/:fileCollectionId/*filePath': 'routeApp'
				for own key,value of routes
					Route.add(key, @[value].bind(@))

				# Once loaded init routes and set us as ready
				Route.setup()

				# Set the app as ready
				@$el.addClass('app-ready')

		# Chain
		@


	# ---------------------------------
	# Routing

	routeApp: ({siteId, fileCollectionId, filePath}) =>
		# Has file
		if filePath
			@openApp({
				site: siteId
				fileCollection: fileCollectionId
				file: filePath
			})

		# Otherwise
		else
			@openApp({
				site: siteId
				fileCollection: fileCollectionId
			})

		# Chain
		@


	# ---------------------------------
	# Application State

	mode: null
	editView: null
	currentSite: null
	currentFileCollection: null
	currentFile: null

	setAppMode: (mode) ->
		@mode = mode

		@$el
			.removeClass('app-login app-admin app-site app-page')
			.addClass('app-'+mode)

		@

	# @TODO
	# This needs to be rewrote to use sockets or something
	openApp: (opts={}) ->
		# Prepare
		opts ?= {}
		opts.navigate ?= true

		# Apply
		@currentSite = opts.site or null
		@currentFileCollection = opts.fileCollection or 'database'
		@currentFile = opts.file or null

		# No Site
		unless @currentSite
			# Apply
			@setAppMode('admin')

			# Navigate to admin
			@navigate('/')  if opts.navigate

			# Done
			return @

		# Site
		Site.collection.fetchItem item: @currentSite, next: (err, @currentSite) =>
			# Handle problems
			throw err  if err
			throw new Error('could not find site')  unless @currentSite

			# Apply
			@$linkSite.text(@currentSite.get('title') or @currentSite.get('name') or @currentSite.get('url'))

			# Prepare
			customFileCollections = @currentSite.get('customFileCollections')

			# Collection
			# There will always be a collection, as we force it earlier
			customFileCollections.fetchItem item: @currentFileCollection, next: (err, @currentFileCollection) =>
				# Handle problems
				throw err  if err
				throw new Error('could not find collection')  unless @currentFileCollection

				# Prepare
				files = @currentFileCollection.get('files')

				# No File
				unless @currentFile
					# Update the collection listing
					$collectionList = @$('.collection-list')
					if $collectionList.data('site') isnt @currentSite
						$collectionList.data('site', @currentSite)
						$collectionList.empty()
						customFileCollections.each (customFileCollection) ->
							$collectionList.append $('<option>', {
								text: customFileCollection.get('name')
							})
						$collectionList.val(@currentFileCollection.get('name'))

					# Update the file listing
					@point(files).controller(FileListItem).to(@$filesList).bind()

					# Apply
					@setAppMode('site')

					# Navigate to site default collection
					@navigate('/site/'+@currentSite.get('slug')+'/'+@currentFileCollection.get('slug'))  if opts.navigate

					# Done
					return @

				# File
				files.fetchItem item: @currentFile, next: (err, @currentFile) =>
					# Handle problems
					throw err  if err
					throw new Error('could not find file')  unless @currentFile

					# Prepare
					{$el, $toggleMeta, $links, $linkPage, $toggles, $toggleMeta, $togglePreview} = @

					# View
					@editView = editView = @point(@currentFile).controller(FileEditItem).to(@$pageEditContainer).bind().getController()

					# Apply
					@point(@currentFile).attributes('title', 'name', 'filename').to($linkPage)

					# Bars
					$toggles.removeClass('active')
					$toggleMeta.addClass('active')
					$togglePreview.addClass('active')
					editView.$metabar.show()
					editView.$previewbar.show()
					editView.$sourcebar.hide()

					# View
					@onWindowResize()

					# Apply
					@setAppMode('page')
					wait 10, => @resizePreviewBar()

					# Navigate to file
					@navigate('/site/'+@currentSite.get('slug')+'/'+@currentFileCollection.get('slug')+'/'+@currentFile.get('slug'))  if opts.navigate

		# Chain
		@

	# A user has logged in successfully
	# so apply the logged in user to our application
	# by saving the user to local storage and taking them to the admin
	loginUser: (email) ->
		return @  unless email

		# Apply the user
		localStorage.setItem('currentUser', email)

		# Update navigation
		@setAppMode('admin')  if @mode is 'login'

		# Chain
		@



	# ---------------------------------
	# Events

	# A "add new website" button was clicked
	# Show the new website modal
	clickAddSite: (e) =>
		@$('.site-add.modal').show()
		@

	# The website modal's save button was clicked
	# So save our changes to the website
	submitSite: (e) =>
		# Disable click through
		e.preventDefault()
		e.stopPropagation()

		# Extract
		url   = (@$('.site-add .field-url :input').val() or '').replace(/\/+$/, '')
		token = @$('.site-add .field-token :input').val() or ''
		name  = @$('.site-add .field-name :input').val() or url.toLowerCase().replace(/^.+?\/\//, '')

		# Default
		url   or= null
		token or= null
		name  or= null

		# Create
		if url and name
			site = Site.collection.create({url, token, name})
		else
			alert 'need more site data'

		# Hide the modal
		@$('.site-add.modal').hide()

		# Chain
		@

	# The website modal's cancel button was clicked
	# So cancel the editing to our website
	submitSiteCancel: (e) =>
		# Disable click through
		e.preventDefault()
		e.stopPropagation()

		# Hide the modal
		@$('.site-add.modal').hide()

		# Chain
		@

	# Handle login button
	# Send the request off to persona to start the login process
	# Receives the result via our `onMessage` handler
	clickLogin: (e) =>
		throw new Error("Offline people can't login")  unless navigator.id?
		navigator.id.request()

	# Handle menu effects
	clickMenuButton: (e) =>
		# Prepare
		{$loadbar} = @
		target = e.currentTarget
		$target = $(target)

		# Apply
		if $loadbar.hasClass('active') is false or $loadbar.data('for') is target
			activate = =>
				$target
					.addClass('active')
					.siblings('.button')
						.addClass('disabled')
			deactivate = =>
				$target
					.removeClass('active')
					.siblings('.button')
						.removeClass('disabled')

			# Cancel
			if $target.hasClass('button-cancel')
				activate()
				@editView.cancel next: ->
					deactivate()

			# Save
			else if $target.hasClass('button-save')
				activate()
				@editView.save next: ->
					deactivate()

		# Chain
		@

	# Request
	request: (opts={}, next) ->
		opts.next ?= next  if next

		@$loadbar
			.removeClass('put post get delete')
			.addClass('active')
			.addClass(opts.method)

		wait 500, => \
		jQuery.ajax(
			url: opts.url
			data: opts.data
			dataType: 'json'
			cache: false
			type: (opts.method or 'get').toUpperCase()
			success: (data, textStatus, jqXHR) =>
				# Done
				@$loadbar.removeClass('active')

				# Parse the response
				data = JSON.parse(data)  if typeof data is 'string'

				# Are we actually an error
				if data.success is false
					err = new Error(data.message or 'An error occured with the request')
					return safe(opts.next, err)

				# Extract the data
				data = data.data  if data.data?

				# Forward
				return safe(opts.next, null, data)

			error: (jqXHR, textStatus, errorThrown) =>
				# Done
				@$loadbar.removeClass('active')

				# Forward
				return safe(opts.next, errorThrown, null)
		)

	# Handle menu effects
	clickMenuToggle: (e) =>
		# Prepare
		$target = $(e.currentTarget)

		# Apply
		$target.toggleClass('active')

		# Handle
		toggle = $target.hasClass('active')
		switch true
			when $target.hasClass('toggle-meta')
				@editView.$metabar.toggle(toggle)
			when $target.hasClass('toggle-preview')
				@editView.$previewbar.toggle(toggle)
			when $target.hasClass('toggle-source')
				@editView.$sourcebar.toggle(toggle)
				@editView.editor?.refresh()

		# Chain
		@

	# Handle menu links
	clickMenuLink: (e) =>
		# Prepare
		$target = $(e.currentTarget)

		# Handle
		switch true
			when $target.hasClass('link-admin')
				@openApp()
			when $target.hasClass('link-site')
				@openApp({
					site: @currentSite
					fileCollection: @currentFileCollection
				})

		# Chain
		@

	# Start viewing a site when it is clicked
	clickSite: (e) =>
		# Disable click through
		e.preventDefault()
		e.stopPropagation()

		# Prepare
		$target = $(e.target)
		$row = $target.parents('.content-row:first')
		item = $row.data('model')

		# Action
		if $target.parents().andSelf().filter('.button-delete').length is 1
			# Delete
			controller = $row.data('controller')
			controller.item.destroy()
			controller.destroy()
		else
			# Open the site
			@openApp({
				site: item
			})

		# Chain
		@

	# Start viewing a collection when it is clicked
	clickCollection: (e) =>
		# Prepare
		$target = $(e.target)
		value = $target.val()
		item = @currentSite.getCollection(value)

		# Open the site
		@openApp({
			site: @currentSite
			fileCollection: item
		})

		# Chain
		@
	# Start viewing a file when it is clicked
	clickFile: (e) =>
		# Disable click through
		e.preventDefault()
		e.stopPropagation()

		# Prepare
		$target = $(e.target)
		$row = $target.parents('.content-row:first')
		item = $row.data('model')

		# Action
		if $target.parents().andSelf().filter('.button-delete').length is 1
			$row.fadeOut(5*1000)
			item.sync method: 'delete', next: (err) ->
				if err
					$row.show()
					throw err
				$row.remove()
		else
			# Open the file
			@openApp({
				site: @currentSite
				fileCollection: @currentFileCollection
				file: item
			})

		# Chain
		@

	# Resize our application when the user resizes their browser
	onWindowResize: => @resizePreviewBar()

	# Resize Preview Bar
	resizePreviewBar: (height) =>
		# Prepare
		$previewbar = @editView?.$previewbar
		$window = $(window)

		# Apply
		$previewbar?.height(height or 'auto')
		$previewbar?.css(
			minHeight: $window.height() - (@$el.outerHeight() - $previewbar.outerHeight())
		)

		# Chain
		@

	# Receives messages from external sources, such as:
	# - the child frame for contenteditable
	# - the persona window for login
	onMessage: (event) =>
		# Extract
		data = event.originalEvent?.data or event.data or {}
		try
			data = JSON.parse(data)  if typeof data is 'string'

		# Resize the child
		if data.action in ['resizeChild', 'childLoaded']
			@resizePreviewBar(data.height+'px')

		# Child has changed
		if data.action is 'change'
			attrs = {}
			attrs[data.attribute] = data.value
			item = @currentFileCollection.get('files').findOne(url: data.url)
			item.set(attrs)

		# Child has loaded
		if data.action is 'childLoaded'
			$previewbar = @editView.$previewbar
			$previewbar.addClass('loaded')

		# Login the user
		if data.d?.assertion?
			@loginUser(data.d.email)

		# Chain
		@

window.app = app = new App(
	el: $('.app')
)
$(window)
	.on('resize', app.onWindowResize.bind(app))
	.on('message', app.onMessage.bind(app))

window.debug = ->
	debugger

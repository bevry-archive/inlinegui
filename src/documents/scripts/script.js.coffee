# Inline GUI

# =====================================
## Helpers

# CoffeeScript friendly setTimeout function

wait = (delay,fn) -> setTimeout(fn,delay)

# Async Friendly Ajax function

request = (url, requestData, next) ->
	requestData ?= {}
	jQuery.ajax(
		url: url
		data: requestData
		dataType: 'json'
		cache: false
		success: (data, textStatus, jqXHR) =>
			# Parse the response
			data = JSON.parse(data)  if typeof data is 'string'

			# Are we actually an error
			if data.success is false
				err = new Error(data.message or 'An error occured with the request')
				return next(err)

			# Extract the data
			data = data.data  if data.data?

			# Forward
			return next(null, data)

		error: (jqXHR, textStatus, errorThrown) =>
			# Forward
			return next(errorThrown, null)
	)


# =====================================
## Models

# Define the Base Model that uses Backbone.js

class Model extends Backbone.Model


# Define the Base Collection that uses QueryEngine.
# QueryEngine adds NoSQL querying abilities to our collections

class Collection extends QueryEngine.QueryCollection
	collection: Collection

	fetchItem: (id, next) ->
		result = @get(id)
		return next(null, result)  if result

		setTimeout(
			=>
				console.log "Couldn't fetch the item, trying again"
				@fetchItem(id, next)
			1000
		)


# -------------------------------------
# Site

# Model
class Site extends Model
	defaults:
		name: null
		url: null
		token: null
		customFileCollections: null  # Collection of CustomFileCollection Models
		files: null  # FileCollection Model

	fetch: (args...) ->
		console.log 'model fetch', args

		site = @
		siteUrl = site.get('url')
		siteToken = site.get('token')

		requestData = {}
		requestData.securityToken = siteToken

		result = {}

		request "#{siteUrl}/restapi/collections/", requestData, (err, data) =>
			throw err  if err
			result.customFileCollections = data

			request "#{siteUrl}/restapi/files/", requestData, (err, data) =>
				throw err  if err
				result.files = data

				@parse(result)

		@

	sync: (args...) ->
		console.log 'model sync', args
		Site.collection.sync()
		@

	toJSON: ->
		exclude = ['customFileCollections', 'files']
		result = super
		for key in exclude
			delete result[key]
		return result

	parse: (response, opts) ->
		# Prepare
		site = @

		# Parse the response
		data = response
		data = JSON.stringify(response)  if typeof response is 'string'
		data = data.data  if data.data?

		if Array.isArray(data.customFileCollections)
			# Add the site to each site collection
			for collection in data.customFileCollections
				collection.site = site

			# Add the site custom file collections to the global collection
			CustomFileCollection.collection.add(data.customFileCollections)

			# Ensure it doesn't overwrite our live collection
			delete data.customFileCollections

		if Array.isArray(data.files)
			# Add the site to each site file
			for file in data.files
				file.site = @

			# Add the site files to the global collection
			File.collection.add(data.files)

			# Ensure it doesn't overwrite our live collection
			delete data.files

		# Return the data
		return data

	initialize: ->
		super

		# Create a live updating collection inside of us of all the FileCollection Models that are for our site
		@attributes.customFileCollections ?= CustomFileCollection.collection.createLiveChildCollection(
			site: @
		)

		# Create a live updating collection inside of us of all the File Models that are for our site
		@attributes.files ?= File.collection.createLiveChildCollection(
			site: @
		)

		# Fetch the latest from the server
		# @fetch()

		# Chain
		@

# Collection
class Sites extends Collection
	model: Site
	collection: Sites

	fetch: (args...) ->
		console.log 'collection fetch', args
		sites = JSON.parse(localStorage.getItem('sites') or 'null') or []
		for site,index in sites
			sites[index] = new Site(site).fetch()
		@add(sites)
		@

	sync: (args...) ->
		console.log 'collection sync', args
		sites = JSON.stringify(@toJSON())
		localStorage.setItem('sites', sites)
		@

# Instantiate the global collection of sites
Site.collection = new Sites()


# -------------------------------------
# Custom File Collections

# Model
class CustomFileCollection extends Model
	defaults:
		id: null
		relativePaths: null  # Array of the relative paths for each file in this collection
		files: null  # A live updating collection of files within this collection
		site: null  # The model of the site this is for

	toJSON: ->
		exclude = ['files', 'site']
		result = super
		for key in exclude
			delete result[key]
		return result

	url: ->
		site = @get.get('site')
		siteUrl = site.get('url')
		siteToken = site.get('token')
		collectionName = @get('name')
		return "#{siteUrl}/restapi/collection/#{collectionName}/?securityToken=#{siteToken}"

	initialize: ->
		super

		# Create a live updating collection inside of us of all the File Models that are for our site and colleciton
		@attributes.files ?= File.collection.createLiveChildCollection(
			site: @get('site')
			relativePath: $in: @get('relativePaths')
		)

		# Chain
		@

# Collection
class CustomFileCollections extends Collection
	model: CustomFileCollection
	collection: CustomFileCollections

# Instantiate the global collection of custom file collections
CustomFileCollection.collection = new CustomFileCollections()


# -------------------------------------
# Files

# Model
class File extends Model
	default:
		meta: null
		filename: null
		relativePath: null
		url: null
		urls: null
		contentType: null
		encoding: null
		content: null
		contentRendered: null
		source: null
		site: null  # The model of the site this is for

	toJSON: ->
		exclude = ['site']
		result = super
		for key in exclude
			delete result[key]
		return result

	get: (key) ->
		value = super('meta')?[key] ? super(key)
		return value

	url: ->
		site = @get.get('site')
		siteUrl = site.get('url')
		siteToken = site.get('token')
		fileName = @get('relativePath')
		return "#{siteUrl}/restapi/file/#{fileName}/?securityToken=#{siteToken}"

	parse: (response, opts) ->
		# Parse the response
		data = JSON.stringify(response).data

		# Apply the received data to the model
		@set(data)

		# Chain
		@

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

	filesIndexedByRelativePath: null

	onFileAdd: (file) =>
		relativePath = file.get('relativePath')

		if relativePath
			@filesIndexedByRelativePath[relativePath] = file

		@

	onFileChange: (file, value) =>
		previousRelativePath = file.previous('relativePath')
		if previousRelativePath
			delete @filesIndexedByRelativePath[previousRelativePath]

		relativePath = file.get('relativePath')
		if relativePath
			@filesIndexedByRelativePath[file.get('relativePath')] = file

		@

	onFileRemove: (file) =>
		relativePath = file.get('relativePath')
		if relativePath
			delete @filesIndexedByRelativePath[relativePath]
		@

	initialize: ->
		super
		@filesIndexedByRelativePath ?= {}
		@on('add', @onFileAdd)
		@on('change:relativePath', @onFileChange)
		@on('remove', @onFileRemove)
		@

	getFileByRelativePath: (relativePath) ->
		return @filesIndexedByRelativePath[relativePath]

# Instantiate the global collection of custom file collections
File.collection = new Files()


# =====================================
## Controllers/Views

class Controller extends Spine.Controller
	destroy: ->
		@release()
		# @item?.destroy()
		@

class FileEditItem extends Controller
	el: $('.pageeditbar').remove().first().prop('outerHTML')

	elements:
		'.field-title  :input': '$title'
		'.field-date   :input': '$date'
		'.field-author :input': '$author'
		'.file-source': '$source'
		'.pagepreviewbar': '$previewbar'
		'.source': '$sourcebar'
		'.metabar': '$metabar'

	render: =>
		# Prepare
		{item, $el, $title, $date, $author, $previewbar, $source} = @
		siteUrl = item.get('site').get('url')

		# Apply
		$el
			.addClass('file-edit-item-'+item.cid)
			.data('item', item)
			.data('controller', @)
		$title.val   item.get('title') or item.get('filename') or ''
		$date.val    item.get('date')?.toISOString()
		$source.val  item.get('source')
		$previewbar.attr('src': siteUrl+item.get('url'))
		# @todo figure out why file.url doesn't work

		# Editor
		#@editor = CodeMirror.fromTextArea($source.get(0), {
		#	mode: item.get('contentType')
		#})

		# Chain
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
		$el
			.addClass('file-list-item-'+item.cid)
			.data('item', item)
			.data('controller', @)
		$title.text  item.get('title') or item.get('filename') or ''
		$tags.text  (item.get('tags') or []).join(', ') or ''
		$date.text   item.get('date')?.toLocaleDateString() or ''

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
		$el
			.addClass('site-list-item-'+item.cid)
			.data('item', item)
			.data('controller', @)
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
		'.content-table.files': '$filesList'
		'.content-table.sites': '$sitesList'

	events:
		'click .sites .content-cell-name': 'clickSite'
		'click .files .content-cell-name': 'clickFile'
		'click .menu .link': 'clickMenuLink'
		'click .menu .toggle': 'clickMenuToggle'
		'click .menu .button': 'clickMenuButton'
		'click .button-login': 'clickLogin'
		'click .button-add-site': 'clickAddSite'
		'submit .site-add-form': 'submitSite'
		'click .site-add-form .button-cancel': 'submitSiteCancel'

	routes:
		'/': 'routeApp'
		'/site/:siteId/': 'routeApp'
		'/site/:siteId/:fileCollectionId': 'routeApp'
		'/site/:siteId/:fileCollectionId/*filePath': 'routeApp'

	constructor: ->
		# Super
		super

		# Sites
		Site.collection.bind('add',      @updateSite)
		Site.collection.bind('remove',   @destroySite)
		Site.collection.bind('reset',    @updateSites)
		Site.collection.fetch()

		# Files
		File.collection.bind('add',      @updateFile)
		File.collection.bind('remove',   @destroyFile)
		File.collection.bind('reset',    @updateFiles)
		# @todo move this into a way where only files for the current site are added

		# Apply
		@onWindowResize()
		@setAppMode('login')

		# Setup routes
		for key,value of @routes
			@route(key, @[value])

		# Login
		currentUser = localStorage.getItem('currentUser') or null
		navigator.id.watch(
			loggedInUser: currentUser
			onlogin: (args...) ->
				# ignore as we listen to post message
			onlogout: ->
				localStorage.setItem('currentUser', '')
		)

		# Login the user if we already have one
		@loginUser(currentUser)  if currentUser

		# Once loaded init routes and set us as ready
		Spine.Route.setup()

		# Set the app as ready
		@$el.addClass('app-ready')

		# Chain
		@


	# ---------------------------------
	# Routing

	routeApp: (opts) ->
		# Prepare
		{siteId, fileCollectionId, filePath} = opts

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

		# Log
		console.log 'openApp', opts

		# Apply
		@currentSite = opts.site or null
		@currentFileCollection = opts.fileCollection or 'database'
		@currentFile = opts.file or null

		# No Site
		unless @currentSite
			# Apply
			@setAppMode('admin')

			# Navigate to admin
			@navigate('/')  if otps.navigate

			# Done
			return @

		# Site
		Site.collection.fetchItem @currentSite, (err, @currentSite) =>
			# Handle problems
			throw err  if err
			throw new Error('could not find site')  unless @currentSite

			# Collection
			# There will always be a collection, as we force it earlier
			CustomFileCollection.collection.fetchItem @currentFileCollection, (err, @currentFileCollection) =>
				# Handle problems
				throw err  if err
				throw new Error('could not find collection')  unless @currentFileCollection

				# No File
				unless @currentFile
					# Apply
					@setAppMode('site')

					# Navigate to site default collection
					@navigate('/site/'+@currentSite.cid+'/'+@currentFileCollection.cid)  if opts.navigate

					# Done
					return @

				# File
				File.collection.fetchItem @currentFile, (err, @currentFile) =>
					# Handle problems
					throw err  if err
					throw new Error('could not find file')  unless @currentFile

					# Delete the old edit view
					if @editView?
						@editView.release()
						@editView = null

					# Prepare
					{$el, $toggleMeta, $links, $linkPage, $toggles, $togglePreview} = @
					title = @currentFile.get('title') or @currentFile.get('filename')

					# View
					@editView = editView = new FileEditItem({
						item: @currentFile
					})
					editView.render()

					# Apply
					$linkPage.text(title)

					# Bars
					$toggles.removeClass('active')

					$togglePreview.addClass('active')
					editView.$previewbar.show()

					editView.$sourcebar.hide()
					###
					if $target.hasClass('button-edit')
						$toggleMeta.addClass('active')
						editView.$metabar.show()
					else
						editView.$metabar.hide()
					###

					# View
					editView.appendTo($el)
					@onWindowResize()

					# Apply
					@setAppMode('page')

					# Navigate to file
					@navigate('/site/'+@currentSite.cid+'/'+@currentFileCollection.cid+'/'+@currentFile.cid)  if opts.navigate

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
	# View Updates

	destroyController: ({findMethod}, item) =>
		controller = findMethod(item)
		controller?.destroy()
		return controller

	updateController: ({$list, klass, findMethod}, item) =>
		controller = findMethod(item)
		if controller?
			controller.render()
		else
			controller = new klass({item})
				.render()
				.appendTo($list)
		return controller

	updateControllers: ({$items, updateMethod}, items) =>
		# remove items that we no longer have
		$items.each ->
			$el = $(@)
			if $el.data('item') not in items
				$el.data('controller').destroy()

		# update items we still have
		controllers = []
		for item in items
			controllers.push updateMethod(item)

		# Return
		return controllers


	findFile: (item) =>
		controller = $(".file-list-item-#{item.cid}:first").data('controller')
		return controller

	destroyFile: (item) =>
		findMethod = @findFile
		return @destroyController({findMethod}, item)

	updateFile: (item) =>
		$list = @$filesList
		klass = FileListItem
		findMethod = @findFile
		return @updateController({$list, klass, findMethod}, item)

	updateFiles: (items) =>
		$items = @$('.content-row-file')
		updateMethod = @updateFile
		return @updateControllers({$items, updateMethod}, items)



	findSite: (item) =>
		controller = $(".site-list-item-#{item.cid}:first").data('controller')
		return controller

	destroySite: (item) =>
		findMethod = @findSite
		return @destroyController({findMethod}, item)

	updateSite: (item) =>
		$list = @$sitesList
		klass = SiteListItem
		findMethod = @findSite
		return @updateController({$list, klass, findMethod}, item)

	updateSites: (items) =>
		$items = @$('.content-row-site')
		updateMethod = @updateSite
		return @updateControllers({$items, updateMethod}, items)



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
		navigator.id.request()

	# Handle menu effects
	clickMenuButton: (e) =>
		# Prepare
		{$loadbar} = @
		target = e.currentTarget
		$target = $(target)

		# Apply
		if $loadbar.hasClass('active') is false or $loadbar.data('for') is target
			$target
				.toggleClass('active')
				.siblings('.button')
					.toggleClass('disabled')
			$loadbar
				.toggleClass('active')
				.toggleClass($target.data('loadclassname'))
				.data('for', target)

		# Chain
		@

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
		item = $row.data('item')

		# Action
		if $target.parents().andSelf().filter('.button-delete').length is 1
			# Delete
			controller = $row.data('controller')
			controller.destroy()
		else
			# Open the site
			@openApp({
				site: item
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
		item = $row.data('item')

		# Open the file
		@openApp({
			site: @currentSite
			fileCollection: @currentFileCollection
			file: item
		})

		# Chain
		@

	# Resize our application when the user resizes their browser
	onWindowResize: =>
		# Prepare
		$window = $(window)
		$previewbar = @$el.find('.previewbar')

		# Apply
		$previewbar.css(
			minHeight: $window.height() - (@$el.outerHeight() - $previewbar.height())
		)

		# Chain
		@

	# Receives messages from external sources, such as:
	# - the child frame for contenteditable
	# - the persona window for login
	onMessage: (event) =>
		# Extract
		data = event.originalEvent?.data or event.data or {}
		data = JSON.parse(data)  if typeof data is 'string'

		# Handle
		switch true
			when data.action is 'resizeChild'
				# Prepare
				$previewbar = @$el.find('.previewbar')

				# Apply
				$previewbar.height(String(data.height)+'px')

			when data.d?.assertion?
				# Prepare
				@loginUser(data.d.email)

			else
				console.log('Unknown message from child:', data)

		# Chain
		@

window.app = app = new App(
	el: $('.app')
)
$(window)
	.on('resize', app.onWindowResize.bind(app))
	.on('message', app.onMessage.bind(app))

wait = (delay,fn) -> setTimeout(fn,delay)
siteUrl = "http://localhost:9778"
siteToken = "blah"
Spine.Model.host = siteUrl


# =====================================
# Models

class Model extends Spine.Model
	get: (key) ->
		return @[key]

	set: (key, value) ->
		@[key] = value
		@

class Site extends Model
	@configure('Site',
		'id', 'name', 'url', 'token', 'filecollections', 'files'
	)
	@extend Spine.Model.Local

	destroy: ->
		for item in @filecollections
			item.destroy()
		for item in @files
			item.destroy()
		super

	fetchCollections: (params={}, options={}) ->
		options.url = "#{@url}/restapi/_collections/?securityToken=#{@token}"
		debugger
		result = FileCollection.fetch(params, options)

		return result

class FileCollection extends Model
	@configure('FileCollection',
		'id', 'name', 'files', 'site')
	@extend Spine.Model.Ajax

	@fromJSON: (response) ->
		unless response
			return []
		if response.success is false
			alert response.message
			return []

		if Spine.isArray(response.data)
			result =
				for data in response.data
					new @(data)
		else
			result = new @(response.data)

		return result

	fetchFiles: (params={}, options={}) ->
		options.url = "#{@url}/restapi/#{@name}/?additionalFields=source&securityToken=#{@token}"
		debugger
		return File.fetch(params, options).done ->
			debugger

class File extends Model
	@configure('File',
		'id', 'meta', 'attrs', 'site'
	)
	@extend Spine.Model.Ajax

	@fromJSON: (response) ->
		unless response
			return []
		if response.success is false
			alert response.message
			return []

		adjust = (data) ->
			meta = data.meta
			delete data.meta
			id = data.id
			delete data.id
			attrs = data
			result = {id, meta, attrs}
			return result

		if Spine.isArray(response.data)
			result =
				for data in response.data
					new @(adjust data)
		else
			result = new @(adjust response.data)

		return result

	get: (key) ->
		value = @meta[key] ? @attrs[key] ? null
		return value

	set: (key,value) ->
		console.log 'not supported yet'
		return @


# =====================================
# Controllers

class Controller extends Spine.Controller
	destroy: ->
		@release()
		@item?.destroy()
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

		# Apply
		$el
			.addClass('file-edit-item-'+item.id)
			.data('item', item)
			.data('controller', @)
		$title.val  item.get('title') or item.get('filename') or ''
		$date.val   item.get('date')?.toISOString()
		$source.val item.get('source')
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
			.addClass('file-list-item-'+item.id)
			.data('item', item)
			.data('controller', @)
		$title.text  item.get('title') or item.get('filename') or ''
		$tags.text  (item.get('tags') or []).join(', ') or ''
		$date.text  item.get('date')?.toLocaleDateString() or ''

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
			.addClass('site-list-item-'+item.id)
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
		'/site/:siteId/:collectionId': 'routeApp'
		'/site/:siteId/:collectionId/*filePath': 'routeApp'

	constructor: ->
		# Super
		super

		# Sites
		Site.bind('save',    @updateSite)
		Site.bind('destroy', @destroySite)
		Site.bind('refresh', @updateSites)
		Site.fetch()

		# Files
		File.bind('save',    @updateFile)
		File.bind('destroy', @destroyFile)
		File.bind('refresh', @updateFiles)
		# @todo figure out how to release/destroy files

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
		{siteId, collectionId, filePath} = opts

		# Has file
		if filePath
			files = File.all().filter (file) ->
				return file.get('relativePath') is filePath

			if files.length is 1
				@openApp({
					site: siteId
					collection: collectionId
					file: files[0]
				})
			else
				console.log('error')

		# Otherwise
		else
			@openApp({
				site: siteId
				collection: collectionId
			})

		# Chain
		@


	# ---------------------------------
	# Application State

	mode: null
	editView: null
	currentSite: null
	currentCollection: null
	currentFile: null

	setAppMode: (mode) ->
		@mode = mode
		@$el
			.removeClass('app-login app-admin app-site app-page')
			.addClass('app-'+mode)
		@

	openApp: (opts) ->
		# Prepare
		opts ?= {}
		{site, collection, file, navigate} = opts
		site ?= null
		collection ?= 'database'
		file ?= null
		navigate ?= true

		# Log
		console.log 'openApp', {site, collection, file, navigate}

		# Fetch
		if site and (typeof site is 'object') is false
			site = Site.find(site)

		# Reset
		@currentSite = site
		@currentCollection = collection
		@currentFile = file

		# Site
		if site
			# File
			if file
				# Delete the old edit view
				if @editView?
					@editView.release()
					@editView = null

				# Prepare
				{$el, $toggleMeta, $links, $linkPage, $toggles, $togglePreview} = @
				title = file.get('title') or file.get('filename')

				# View
				@editView = editView = new FileEditItem({item:file})
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
				@navigate('/site/'+site.get('id')+'/'+collection+'/'+file.get('relativePath'))  if navigate

			# No file
			else
				# Fetch all the files for the collection
				site.fetchCollections()

				# Apply
				@setAppMode('site')

				# Navigate to site default collection
				@navigate('/site/'+site.get('id')+'/'+collection)  if navigate

		# No site
		else
			# Apply
			@setAppMode('admin')

			# Navigate to admin
			@navigate('/')  if navigate

		# Chain
		@

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
		controller = $(".file-list-item-#{item.id}:first").data('controller')
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
		controller = $(".site-list-item-#{item.id}:first").data('controller')
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

	clickAddSite: (e) =>
		@$('.site-add.modal').show()
		@

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
			site = Site.create({url, token, name})
			site.save()
		else
			alert 'need more site data'

		# Hide the modal
		@$('.site-add.modal').hide()

		# Chain
		@

	submitSiteCancel: (e) =>
		# Disable click through
		e.preventDefault()
		e.stopPropagation()

		# Hide the modal
		@$('.site-add.modal').hide()

		# Chain
		@

	clickLogin: (e) =>
		navigator.id.request()

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
					collection: @currentCollection
				})

		# Chain
		@

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
			collection: @currentCollection
			file: item
		})

		# Chain
		@

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

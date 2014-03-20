# Import
$ = window.$
{View, Route} = require('./base')
{Site} = require('../models/site')
{SiteListItem} = require('./site')
{FileEditItem, FileListItem} = require('./file')
{wait, thrower} = require('../util')

# View
class App extends View
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
		@point(item:Site.collection, viewClass:SiteListItem, element:@$sitesList).bind()

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
			Site.collection.fetch null, (err) =>
				throw err  if err

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
		Site.collection.fetchItem {item: @currentSite}, (err, @currentSite) =>
			# Handle problems
			throw err  if err
			throw new Error('could not find site')  unless @currentSite

			# Apply
			@$linkSite.text(@currentSite.get('title') or @currentSite.get('name') or @currentSite.get('url'))

			# Prepare
			customFileCollections = @currentSite.get('customFileCollections')

			# Collection
			# There will always be a collection, as we force it earlier
			customFileCollections.fetchItem {item: @currentFileCollection}, (err, @currentFileCollection) =>
				# Handle problems
				throw err  if err
				throw new Error('could not find collection')  unless @currentFileCollection

				# Prepare
				files = @currentFileCollection.get('files')

				# No File
				unless @currentFile
					# Update the collection listing
					$collectionList = @$el.find('.collection-list')
					if $collectionList.data('site') isnt @currentSite
						$collectionList.data('site', @currentSite)
						$collectionList.empty()
						customFileCollections.each (customFileCollection) ->
							$collectionList.append $('<option>', {
								text: customFileCollection.get('name')
							})
						$collectionList.val(@currentFileCollection.get('name'))

					# Update the file listing
					@point(item:files, viewClass:FileListItem, element:@$filesList).bind()

					# Apply
					@setAppMode('site')

					# Navigate to site default collection
					@navigate('/site/'+@currentSite.get('slug')+'/'+@currentFileCollection.get('slug'))  if opts.navigate

					# Done
					return @

				# File
				files.fetchItem {item: @currentFile}, (err, @currentFile) =>
					# Handle problems
					throw err  if err
					throw new Error('could not find file')  unless @currentFile

					# Prepare
					{$el, $toggleMeta, $links, $linkPage, $toggles, $toggleMeta, $togglePreview} = @

					# View
					@editView = editView = @point(item:@currentFile, viewClass:FileEditItem, element:@$pageEditContainer).bind().getView()

					# Apply
					@point(item:@currentFile, itemAttributes:['title', 'name', 'filename'], element:$linkPage).bind()

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
		@$el.find('.site-add.modal').show()
		@

	# The website modal's save button was clicked
	# So save our changes to the website
	submitSite: (e) =>
		# Disable click through
		e.preventDefault()
		e.stopPropagation()

		# Extract
		url   = (@$el.find('.site-add .field-url :input').val() or '').replace(/\/+$/, '')
		token = @$el.find('.site-add .field-token :input').val() or ''
		name  = @$el.find('.site-add .field-name :input').val() or url.toLowerCase().replace(/^.+?\/\//, '')

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
		@$el.find('.site-add.modal').hide()

		# Chain
		@

	# The website modal's cancel button was clicked
	# So cancel the editing to our website
	submitSiteCancel: (e) =>
		# Disable click through
		e.preventDefault()
		e.stopPropagation()

		# Hide the modal
		@$el.find('.site-add.modal').hide()

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
				@editView.cancel {}, ->
					deactivate()

			# Save
			else if $target.hasClass('button-save')
				activate()
				@editView.save {}, ->
					deactivate()

		# Chain
		@

	# Request
	request: (opts={}, next) ->
		next ?= thrower.bind(@)

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
					return next(err, data)

				# Extract the data
				data = data.data  if data.data?

				# Forward
				return next(null, data)

			error: (jqXHR, textStatus, errorThrown) =>
				# Done
				@$loadbar.removeClass('active')

				# Forward
				return next(errorThrown, null)
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
			controller = $row.data('view')
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
			item.destroy {sync: true}, (err) ->
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

# Export
module.exports = {App}

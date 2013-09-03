wait = (delay,fn) -> setTimeout(fn,delay)
siteUrl = "http://localhost:9778"
Spine.Model.host = siteUrl

window.File = class File extends Spine.Model
	@configure('File',
		'meta'
		'attrs'
	)

	@extend Spine.Model.Ajax

	@url: "#{siteUrl}/restapi/documents/?additionalFields=source"

	@fromJSON: (response) ->
		return  unless response

		adjust = (data) ->
			meta = data.meta
			delete data.meta
			attrs = data
			result = {meta, attrs}
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

class FileEditItem extends Spine.Controller
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


class FileListItem extends Spine.Controller
	el: $('.content-table.files .content-row:last').remove().first().prop('outerHTML')

	elements:
		'.content-name': '$title'
		'.content-cell-tags': '$tags'
		'.content-cell-date': '$date'

	render: =>
		# Prepare
		{item, $el, $title, $tags, $date} = @

		# Apply
		$el.data('file', item)
		$title.text  item.get('title') or item.get('filename') or ''
		$tags.text  (item.get('tags') or []).join(', ') or ''
		$date.text  item.get('date')?.toLocaleDateString() or ''
		console.log item
		# Chain
		@

class App extends Spine.Controller
	editView: null

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
		'.content-row-file': '$files'

	events:
		'click .sites .content-cell-name': 'clickSite'
		'click .files .content-cell-name': 'clickFile'
		'click .menu .link': 'clickMenuLink'
		'click .menu .toggle': 'clickMenuToggle'
		'click .menu .button': 'clickMenuButton'
		'click .button-login': 'clickLogin'

	routes:
		'/': 'routeApp'
		'/site/:siteId/': 'routeApp'
		'/site/:siteId/:collectionId': 'routeApp'
		'/site/:siteId/:collectionId/*filePath': 'routeApp'

	clickLogin: (e) ->
		navigator.id.request()

	routeApp: (opts) ->
		# Prepare
		{siteId, collectionId, filePath} = opts

		# Has file
		if filePath
			files = File.all().filter (file) ->
				return file.get('relativePath') is filePath

			if files.length is 1
				@openApp(siteId, collectionId, files[0])
			else
				console.log('error')

		# Otherwise
		else
			@openApp(siteId, collectionId)

		# Chain
		@

	constructor: ->
		# Super
		super

		# Fetch
		File.bind('create', @addFile)
		File.bind('refresh change', @addFiles)
		# @todo figure out how to release/destroy files

		# Apply
		@onWindowResize()
		@setAppMode('login')

		# Setup routes
		for key,value of @routes
			@route(key, @[value])

		# Once loaded init routes and set us as ready
		Spine.Route.setup()

		# Ajax queue events
		Spine.Ajax.queue (args...) =>
			# hide a loading bar

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

		# Set the app as ready
		@$el.addClass('app-ready')

		# Chain
		@

	mode: null
	setAppMode: (mode) ->
		@mode = mode
		@$el
			.removeClass('app-login app-admin app-site app-page')
			.addClass('app-'+mode)
		@

	loginUser: (email) ->
		if email
			# Apply the user
			localStorage.setItem('currentUser', email)

			# Update navigation
			@openApp()  if @mode is 'login'
		@

	addFile: (item) =>
		{$filesList} = @
		view = new FileListItem({item})
			.render()
			.appendTo($filesList)
		@

	resetFiles: =>
		{$files} = @
		$files.remove()
		@

	addFiles: =>
		@resetFiles()  # todo make this better
		@addFile(file)  for file in File.all()
		@

	clickMenuButton: (e) =>
		# Prepare
		{$loadbar} = @
		target = e.currentTarget
		$target = $(e.currentTarget)

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
				@openApp(@currentSite, @currentCollection)

		# Chain
		@

	clickSite: (e) =>
		# Disable click through
		e.preventDefault()
		e.stopPropagation()

		# Prepare
		$target = $(e.currentTarget)
		$row = $target.parents('.content-row:first')
		siteId = $row.data('site')

		# Open the site
		@openApp(siteId)

		# Chain
		@

	clickFile: (e) =>
		# Disable click through
		e.preventDefault()
		e.stopPropagation()

		# Prepare
		$target = $(e.currentTarget)
		$row = $target.parents('.content-row:first')
		file = $row.data('file')

		# Open the file
		@openApp(@currentSite, @currentCollection, file)

		# Chain
		@

	currentSite: null
	currentCollection: null
	currentFile: null

	openApp: (siteId, collectionId='database', file) ->
		# Log
		console.log 'openApp', {siteId, collectionId, file}

		# Reset
		@currentSite =
			@currentCollection =
			@currentFile = null

		# Site
		if siteId
			# Select
			@currentSite = siteId

			# Select
			@currentCollection = collectionId

			# File
			if file
				# Select
				@currentFile = file

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
				@setAppMode('page')
				$links.removeClass('active')
				$linkPage.text(title).addClass('active')

				# Bars
				$toggles.removeClass('active')

				$togglePreview.addClass('active')
				editView.$previewbar.show()

				editView.$sourcebar.hide()
				###
				if $target.hasClass('button-edit')
					$toggleMeta
						.addClass('active')
					editView.$metabar.show()
				else
					editView.$metabar.hide()
				###

				# View
				editView.appendTo($el)
				@onWindowResize()

				# Navigate to file
				@navigate('/site/'+siteId+'/'+collectionId+'/'+file.get('relativePath'))

			# No file
			else
				# Apply
				@setAppMode('site')

				# Fetch all the files for the collection
				File.fetch()

				# Navigate to site default collection
				@navigate('/site/'+siteId+'/'+collectionId)

		# No site
		else
			# Apply
			@setAppMode('admin')

			# Navigate to admin
			@navigate('/')

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

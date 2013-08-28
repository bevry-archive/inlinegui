wait = (delay,fn) -> setTimeout(fn,delay)
siteUrl = "http://localhost:9778"
Spine.Model.host = siteUrl

class File extends Spine.Model
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
	el: $('.editbar').remove().first().prop('outerHTML')

	elements:
		'.field-title  :input': '$title'
		'.field-date   :input': '$date'
		'.field-author :input': '$author'
		'.file-source': '$source'
		'.previewbar': '$previewbar'
		'.sourcebar': '$sourcebar'
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
		@editor = CodeMirror.fromTextArea($source.get(0), {
			mode: item.get('contentType')
		})

		# Chain
		@


class FileListItem extends Spine.Controller
	el: $('.content-row-file').remove().first().prop('outerHTML')

	elements:
		'.content-title': '$title'
		'.content-tags': '$tags'
		'.content-date': '$date'

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
		'.navbar': '$navbar'
		'.navbar .link': '$links'
		'.navbar .toggle': '$toggles'
		'.link-site': '$linkSite'
		'.link-page': '$linkPage'
		'.toggle-preview': '$togglePreview'
		'.toggle-meta': '$toggleMeta'
		'.content-table': '$filesList'
		'.content-row-file': '$files'

	events:
		'click .link-site': 'clickSite'
		'click .button-edit, .content-name': 'clickFile'
		'click .navbar .toggle': 'clickToggle'
		'click .navbar .button': 'clickButton'
		'click .button-login': 'clickLogin'

	routes:
		'/:collectionName/': 'routeCollection'
		'/:collectionName/*relativePath': 'routeFile'

	clickLogin: (e) ->
		navigator.id.request()

	routeCollection: (opts) ->
		{collectionName} = opts

		@openCollection(collectionName)

	routeFile: (opts) ->
		{collectionName, relativePath} = opts

		files = File.all().filter (file) ->
			return file.get('relativePath') is relativePath

		if files.length is 1
			@openFile(files[0])
		else
			console.log('error')

		@

	constructor: ->
		# Super
		super

		# Fetch
		File.bind('create', @addFile)
		File.bind('refresh change', @addFiles)
		File.fetch()
		# @todo figure out how to release/destroy files

		# Apply
		@openCollection('database')
		@onWindowResize()

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
				localStorage.setItem('currentUser', null)
		)
		@loginUser(currentUser)  if currentUser

		# Once loaded init routes and set us as ready
		Spine.Ajax.queue (args...) =>
			Spine.Route.setup()
			@$el.addClass('app-ready')

		# Chain
		@

	loginUser: (email) ->
		localStorage.setItem('currentUser', email)
		@$('.loginbar').hide()
		@

	addFile: (item) =>
		{$filesList} = @
		view = new FileListItem({item})
			.render()
			.appendTo($filesList)
		@

	addFiles: =>
		{$files} = @
		$files.remove()
		@addFile(file)  for file in File.all()
		@

	clickButton: (e) =>
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

	clickToggle: (e) =>
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

	clickFile: (e) =>
		# Disable click through
		e.preventDefault()
		e.stopPropagation()

		# Prepare
		$target = $(e.currentTarget)
		$row = $target.parents('.content-row:first')
		file = $row.data('file')

		# Navigate
		@navigate('/database/'+file.get('relativePath'))

		# Chain
		@

	openFile: (file) =>
		# Clean
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
		$el.removeClass('app-site').addClass('app-page')
		$links.removeClass('active')
		$linkPage.text(title).addClass('active')
		$toggles.removeClass('active')

		$togglePreview.addClass('active')
		editView.$previewbar.show()

		# Bars
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

	clickSite: =>
		# Navigate
		@navigate('/database/')

		# Chain
		@

	openCollection: (collectionName) ->
		# Clean
		if @editView?
			@editView.release()
			@editView = null

		# Prepare
		collectionName ?= 'database'
		{$el, $linkSite} = @

		# Apply
		$el
			.removeClass('app-page')
			.addClass('app-site')
		$linkSite
			.addClass('active')
			.siblings().removeClass('active')

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

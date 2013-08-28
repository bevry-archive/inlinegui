wait = (delay,fn) -> setTimeout(fn,delay)
siteUrl = "http://localhost:9778"

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
		'.previewbar': '$iframe'

	render: =>
		# Prepare
		{item, $el, $title, $date, $author, $iframe, $source} = @

		# Apply
		$title.val  item.get('title') or item.get('filename') or ''
		$date.val   item.get('date')?.toISOString()
		$source.val item.get('source')
		$iframe.attr('src': siteUrl+item.get('url'))
		# @todo figure out why file.url doesn't work

		# Chain
		@

	appendTo: =>
		# Super
		super

		# Prepare
		{item, $source} = @

		# Editor
		@editor = CodeMirror.fromTextArea($source.get(0), {
			mode: item.get('contentType')
		})

		# Chain
		return @


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
		'click .link-site': 'siteMode'
		'click .button-edit, .content-name': 'pageMode'
		'click .navbar .toggle': 'clickToggle'
		'click .navbar .button': 'clickButton'

	constructor: ->
		# Super
		super

		# Fetch
		File.bind('create', @addFile)
		File.bind('refresh change', @addFiles)
		File.fetch()
		# @todo figure out how to release/destroy files

		# Apply
		@siteMode()
		@onWindowResize()
		@$el.addClass('app-ready')

		# Chain
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

	clickToggle: (e) ->
		# Prepare
		$target = $(e.currentTarget)

		# Apply
		$target.toggleClass('active')

		# Chain
		@

	pageMode: (e) =>
		# Disable click through
		e.preventDefault()
		e.stopPropagation()

		# Clean
		if @editView?
			@editView.release()
			@editView = null

		# Prepare
		{$el, $toggleMeta, $links, $linkPage, $toggles, $togglePreview} = @
		$target = $(e.currentTarget)
		$row = $target.parents('.content-row:first')
		file = $row.data('file')
		title = file.meta.title or file.filename

		# Apply
		$el
			.removeClass('app-site')
			.addClass('app-page')
		$links
			.removeClass('active')
		$linkPage
			.text(title)
			.addClass('active')
		$toggles
			.removeClass('active')
		$togglePreview
			.addClass('active')
		if $target.hasClass('button-edit')
			$toggleMeta
				.addClass('active')

		# View
		@editView = new FileEditItem({item:file})
			.render()
			.appendTo($el)
		@onWindowResize()

		# Chain
		@

	siteMode: =>
		# Prepare
		{$el, $linkSite} = @

		# Clean
		if @editView?
			@editView.release()
			@editView = null

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
		$previewbar = this.$el.find('.previewbar')

		# Apply
		$previewbar.css(
			minHeight: $window.height() - (this.$el.outerHeight() - $previewbar.height())
		)

		# Chain
		@

	onChildMessage: (event) =>
		# Extract
		data = event.originalEvent?.data or event.data or {}
		{action} = data

		# Handle
		switch action
			when 'resizeChild'
				# Prepare
				$previewbar = this.$el.find('.previewbar')

				# Apply
				$previewbar.height(String(data.height)+'px')

			else
				console.log('Unknown message from child:', data)

		# Chain
		@

window.app = app = new App(
	el: $('.app')
)
$(window)
	.on('resize', app.onWindowResize.bind(app))
	.on('message', app.onChildMessage.bind(app))

wait = (delay,fn) -> setTimeout(fn,delay)

class File extends Spine.Model
	@configure('File',
		'meta'
		'id'
		'filename'
		'relativePath'
		'date'
		'extension'
		'contentType'
		'encoding'
		'content'
		'contentRendered'
		'url'
		'urls'
	)

	@extend Spine.Model.Ajax

	@url: '/restapi/documents/'

	@fromJSON: (response) ->
		return  unless response

		if Spine.isArray(response.data)
			result = (new @(item)  for item in response.data)
		else
			result = new @(response.data)

		return result

class FileListItem extends Spine.Controller
	el: $('.content-row-file').remove().first().prop('outerHTML')

	elements:
		'.content-title': '$title'
		'.content-tags': '$tags'
		'.content-date': '$date'

	render: =>
		# Prepare
		{meta, filename, date} = @item
		{$el, $title, $tags, $date} = @

		# Apply
		$title.text meta?.title or filename or ''
		$tags.text  meta?.tags?.join(', ') or ''
		$date.text  date?.toLocaleDateString() or ''

		# Chain
		@

class App extends Spine.Controller
	elements:
		'window': '$window'
		'.loadbar': '$loadbar'
		'.sitebar': '$sitebar'
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
		'resize window': 'onWindowResize'
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

		# Apply
		@siteMode()
		@onWindowResize()
		@$el.addClass('app-ready')

		# Chain
		@

	addFile: (item) =>
		{$filesList} = @
		view = new FileListItem({item})
		$filesList.append(view.render().el)
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

		# Prepare
		{$el, $toggleMeta, $links, $linkPage, $toggles, $togglePreview} = @
		$target = $(e.currentTarget)
		$row = $target.parents('.content-row:first')

		# Fetch the page title
		if $row.length
			title = $row.find('.content-title:first').text()
		else
			title = 'Page'

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

		# Chain
		@

	siteMode: =>
		# Prepare
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
		{$sitebar} = @

		# Apply
		$sitebar.css(
			'min-height': @$window.height() - @$navbar.outerHeight()
		)

		# Chain
		@

	onIframeResize: (size) =>
		# Prepare
		{$sitebar} = @

		# Apply
		$sitebar.height(size)

		# Chain
		@

window.app = app = new App(
	el: $('.app')
)
window.resizeIframe = app.onIframeResize.bind(app)

wait = (delay,fn) -> setTimeout(fn,delay)

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

	events:
		'resize window': 'onWindowResize'
		'click .link-site': 'siteMode'
		'click .button-edit, .content-name': 'pageMode'
		'click .navbar .toggle': 'clickToggle'
		'click .navbar .button': 'clickButton'

	constructor: ->
		# Super
		super

		# Apply
		@siteMode()
		@onWindowResize()
		@$el.addClass('app-ready')

		# Chain
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
		# Apply
		@$sitebar.css(
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

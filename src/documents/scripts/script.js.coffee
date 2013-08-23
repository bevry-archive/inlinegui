wait = (delay,fn) -> setTimeout(fn,delay)

class App extends Spine.Controller
	elements:
		'.loadbar': '$loadbar'
		'.sitebar': '$sitebar'
		'.link-site': '$linkSite'
		'.toggle-meta': '$toggleMeta'

	events:
		'click .link-site': 'siteMode'
		'click .button-edit, .content-name': 'pageMode'
		'click .toggle': 'clickToggle'
		'click .button': 'clickButton'

	constructor: ->
		super

		{$el} = @

		@$sitebar.css(
			'min-height': $(window).height() - $('.navbar').outerHeight()
		)

		@siteMode()

		$el.addClass('app-ready')

	clickButton: (e) =>
		target = e.currentTarget
		$target = $(e.currentTarget)
		{$loadbar} = @

		if $loadbar.hasClass('active') is false or $loadbar.data('for') is target
			$target.siblings('.button').toggleClass('disabled')
			$target.toggleClass('active')
			$loadbar
				.toggleClass('active')
				.toggleClass($target.data('loadclassname'))
				.data('for', target)

	clickToggle: (e) ->
		$target = $(e.currentTarget)
		$target.toggleClass('active')

	pageMode: (e) =>
		{$el, $toggleMeta} = @
		e.preventDefault()
		e.stopPropagation()

		$target = $(e.currentTarget)
		$row = $target.parents('.content-row:first')

		if $row.length
			title = $row.find('.content-title:first').text()
		else
			title = 'Page'

		$el
			.removeClass('app-site')
			.addClass('app-page')
			.find('.navbar')
				.find('.link')
					.removeClass('active')
					.end()
				.find('.link-page')
					.text(title)
					.addClass('active')
					.end()
				.find('.toggle')
					.removeClass('active')
					.end()
				.find('.toggle-preview')
					.addClass('active')
					.end()

		if $target.hasClass('button-edit')
			$toggleMeta.addClass('active')

	siteMode: =>
		{$el, $linkSite} = @
		$el
			.removeClass('app-page')
			.addClass('app-site')
		$linkSite
			.addClass('active')
			.siblings().removeClass('active')

	resize: (size) =>
		{$sitebar} = @
		$sitebar.height(size)

window.app = app = new App(
	el: $('.app')
)
window.resizeIframe = app.resize.bind(app)

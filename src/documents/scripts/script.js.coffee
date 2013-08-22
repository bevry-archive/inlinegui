wait = (delay,fn) -> setTimeout(fn,delay)

class App
	constructor: ->
		$(@domReady)

	domReady: =>
		$('.link-site').click(@siteMode)
		$('.button-edit, .content-name').click(@pageMode)

		$('.toggle').click ->
			$this = $(this)
			$this.toggleClass('active')

		$('.navbar .button').click ->
			$this = $(this)
			$loadbar = $('.loadbar')

			if $loadbar.hasClass('active') is false or $loadbar.data('for') is this
				$this.siblings('.button').toggleClass('disabled')
				$this.toggleClass('active')
				$loadbar
					.toggleClass('active')
					.toggleClass($this.data('loadclassname'))
					.data('for', this)

		$('.navbar .button-toggle').click ->
			$this = $(this)
			$this.toggleClass('active')
			$('.mainbar').toggleClass('active')

		$('.sitebar').css(
			'min-height': $(window).height() - $('.navbar').outerHeight()
		)

		@siteMode()

		wait 3, ->
			$('.app').addClass('app-ready')

	pageMode: (e) =>
		e.preventDefault()
		e.stopPropagation()

		$target = $(e.target)
		$row = $target.parents('.content-row:first')

		if $row.length
			title = $row.find('.content-title:first').text()
		else
			title = 'Page'

		$('.app')
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
			$('.toggle-meta').addClass('active')

	siteMode: =>
		$('.app')
			.removeClass('app-page')
			.addClass('app-site')
		$('.link-site')
			.addClass('active')
			.siblings().removeClass('active')

	resize: (size) =>
		$('.sitebar').height(size)

app = new App()

window.resizeIframe = app.resize.bind(app)
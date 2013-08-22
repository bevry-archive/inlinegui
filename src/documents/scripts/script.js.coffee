wait = (delay,fn) -> setTimeout(fn,delay)

class App
	constructor: ->
		$(@domReady)

	domReady: =>
		$('.navbar .link').click ->
			$this = $(this)
			$app = $('.app')

			$this.addClass('active').siblings().removeClass('active')

			if $this.hasClass('link-page')
				$app
					.removeClass('app-site')
					.addClass('app-page')

			else if $this.hasClass('link-site')
				$app
					.addClass('app-site')
					.removeClass('app-page')

		$('.navbar .button:not(.button-toggle)').click ->
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

		wait 3, ->
			$('.app').addClass('app-ready')

	resize: (size) =>
		$('.sitebar').height(size)

app = new App()

window.resizeIframe = app.resize.bind(app)
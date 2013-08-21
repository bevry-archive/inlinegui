$('.links .link').click ->
	$this = $(this)
	$app = $('.app')

	$this.addClass('active').siblings().removeClass('active')
	if $this.hasClass('page')
		$app.removeClass('site').addClass('page')
	else if $this.hasClass('site')
		$app.removeClass('page').addClass('site')

$('.buttons .button').click ->
	$this = $(this)
	$loadbar = $('.loadbar')
	if $loadbar.hasClass('active') is false or $loadbar.data('for') is this
		$this.siblings('.button').toggleClass('disabled')
		$this.toggleClass('active')
		$loadbar
			.toggleClass('active')
			.toggleClass($this.data('loadclassname'))
			.data('for', this)

$('.buttons .toggle').click ->
	$this = $(this)
	$this.toggleClass('active')
	$('section.main').toggleClass('active')
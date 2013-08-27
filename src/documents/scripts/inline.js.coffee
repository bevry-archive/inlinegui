# This script is injected into the iframe
if parent?
	document.body.style.background = 'green'
	setInterval(
		-> parent?.resizeIframe?(document.body.scrollHeight)
		100
	)
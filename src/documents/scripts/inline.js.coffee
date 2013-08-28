# This script is injected into the iframe
if parent?
	document.body.style.background = 'green'
	setInterval(
		->
			parent?.postMessage?({
				action: 'resizeChild',
				height: document.body.scrollHeight
			}, '*')
		100
	)
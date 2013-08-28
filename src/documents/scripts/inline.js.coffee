# This script is injected into the iframe
if parent?
	setInterval(
		->
			parent?.postMessage?({
				action: 'resizeChild',
				height: document.body.scrollHeight
			}, '*')
		100
	)
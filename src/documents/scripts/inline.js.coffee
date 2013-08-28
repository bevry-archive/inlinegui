# This script is injected into the iframe
if parent isnt self
	# Resize ourselves in the parent
	setInterval(
		->
			parent.postMessage?({
				action: 'resizeChild',
				height: document.body.scrollHeight
			}, '*')
		100
	)

	# Add the style to all editables
	for item in document.getElementsByClassName('inlinegui-editable')
		item.setAttribute('contenteditable', true)

	# TODO:
	# - track dirty state
	# - track changes
	# - add dirty classname when dirty

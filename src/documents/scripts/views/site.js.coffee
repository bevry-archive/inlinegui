# Import
_ = window._
$ = window.$
{View} = require('./base')

# View
class SiteListItem extends View
	el: $('.content-table.sites .content-row:last').remove().first().prop('outerHTML')

	elements:
		'.content-name': '$name'

	render: =>
		# Prepare
		{item, $el, $name} = @

		# Apply
		$name.text item.get('name') or item.get('url') or ''

		# Chain
		@

# Export
module.exports = {SiteListItem}
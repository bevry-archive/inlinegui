# Import
Backbone = window.Backbone
queryEngine = require('query-engine')
{wait, safe} = require('../util')


# Define the Base Model that uses Backbone.js
class Model extends window.Backbone.Model


# Define the Base Collection that uses QueryEngine.
# QueryEngine adds NoSQL querying abilities to our collections
class Collection extends queryEngine.QueryCollection
	collection: Collection

	fetchItem: (opts={}, next) ->
		opts.next ?= next  if next

		opts.item = opts.item.get?('slug') or opts.item

		#console.log("Fetching", opts.item, "from", @options.name or @)

		result = @get(opts.item)
		return safe(opts.next, null, result)  if result

		wait 1000, =>
			#console.log "Couldn't fetch the item, trying again"
			@fetchItem(opts)

		@


# Export
module.exports = {Model, Collection}
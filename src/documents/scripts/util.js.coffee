# Helpers
wait = (delay,fn) -> setTimeout(fn,delay)
safe = (next, err, args...) ->
	return next(err, args...)  if next
	throw err  if err
	return
slugify = (str) ->
	str.replace(/[^:-a-z0-9\.]/ig, '-').replace(/-+/g, '')
extractData = (response) ->
	data = response
	data = JSON.parse(data)  if typeof data is 'string'
	data = data.data  if data.data?
	return data
extractSyncOpts = (args) ->
	# Extract sync arguments
	if args.length is 3
		opts = args[2] or {}
		opts.method = args[0]
	else
		opts = args[0]
		opts.next ?= args[1] or null
	return opts
waiter = (delay,fn) -> setInterval(fn, delay)
sendMessage = (data) -> parent.postMessage(data, '*')

# Export
module.exports = {wait, safe, slugify, extractData, extractSyncOpts, waiter, sendMessage}
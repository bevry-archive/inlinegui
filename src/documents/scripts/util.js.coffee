# Helpers
wait = (delay,fn) -> setTimeout(fn,delay)

thrower = (err, args...) ->
	if err
		console.log('Something has gone wrong', @, err, args)
		throw err
	else
		console.log('Something has gone well', @, args)
	return

slugify = (str) ->
	str.replace(/[^:-a-z0-9\.]/ig, '-').replace(/-+/g, '')

extractData = (response) ->
	data = response
	data = JSON.parse(data)  if typeof data is 'string'
	data = data.data  if data.data?
	return data

waiter = (delay,fn) ->
	setInterval(fn, delay)

sendMessage = (data) ->
	parent.postMessage(data, '*')

within = (date, ms) ->
	now = new Date()
	return (date? is false) or (now.getTime() < date.getTime()+ms)

ignoreSync = (opts) ->
	if opts.method is 'save'
		return false
	else if @syncing is true
		return true
	else if @synced and within(@synced, 1000*10)  # 10 seconds
		return true
	else
		return false


# Export
module.exports = {wait, thrower, slugify, extractData, waiter, sendMessage, within, ignoreSync}

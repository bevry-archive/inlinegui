# Import
{Route} = require('spine-route')
{Pointer} = require('pointers')
MiniView = require('miniview').View

# View
class View extends MiniView
	point: (args...) ->
		pointer = new Pointer(args...)
		(@pointers ?= []).push(pointer)
		return pointer

	destroy: ->
		pointer.destroy()  for pointer in @pointers  if @pointers
		@pointers = null
		return super

	navigate: (args...) ->
		return Route.navigate.apply(Route, args)

# Export
module.exports = {View, Route}
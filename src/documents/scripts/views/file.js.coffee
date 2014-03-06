# Import
CodeMirror = window.CodeMirror
_ = window._
$ = window.$
moment = require('moment')
{View} = require('./base')
{thrower} = require('../util')

# View
class FileEditItem extends View
	el: $('.page-edit').remove().first().prop('outerHTML')

	elements:
		'.field-title  :input': '$title'
		'.field-date   :input': '$date'
		'.field-author :input': '$author'
		'.field-layout :input': '$layout'
		'.page-source  :input': '$source'
		'.page-preview': '$previewbar'
		'.page-source':  '$sourcebar'
		'.page-meta':    '$metabar'

	getCollectionSelectValues: (collectionName) ->
		{item} = @
		selectValues = []
		selectValues.push $ '<option>',
			text: 'None'
			value: ''
		for model in item.get('site').getCollectionFiles(collectionName)?.models or []
			selectValues.push $ '<option>',
				text: model.get('title') or model.get('name') or model.get('relativePath')
				value: model.get('relativePath')
		return selectValues

	getOtherSelectValues: (fieldName) ->
		{item} = @
		selectValues = _.uniq item.get('site').get('files').pluck(fieldName)
		return selectValues

	render: =>
		# Prepare
		{item, $el, $source, $date, $title, $layout, $author, $previewbar, $source} = @

		# Apply
		$author.empty().append(
			@getCollectionSelectValues('authors').concat @getOtherSelectValues('author')
		)
		$layout.empty().append(
			@getCollectionSelectValues('layouts').concat @getOtherSelectValues('author')
		)

		@point(item:item, itemAttributes:['layout'], element:$layout).bind()
		@point(item:item, itemAttributes:['author'], element:$author).bind()
		@point(item:item, itemAttributes:['source'], element:$source).bind()
		@point(item:item, itemAttributes:['title', 'name', 'filename'], element:$title, itemSetter:true).bind()

		@point(
			item: item
			itemAttributes: ['url']
			element:$previewbar
			elementSetter: ({$el}) ->
				$el.attr('src': item.get('site').get('url')+item.get('url'))
		).bind()

		@point(
			item: item
			itemAttributes:['date']
			element:$date
			elementSetter: ({el, value}) ->
				$el.val moment(value).format('YYYY-MM-DD')  if value?
		).bind()

		# Editor
		@editor = CodeMirror.fromTextArea($source.get(0), {
			mode: item.get('contentType')
		})

		# Chain
		@

	cancel: (opts={}, next) ->
		next ?= thrower.bind(@)
		@item.reset(opts)
		next()
		@

	save: (opts={}, next) ->
		next ?= thrower.bind(@)
		@item.sync(opts, next)
		@

# View
class FileListItem extends View
	el: $('.content-table.files .content-row:last').remove().first().prop('outerHTML')

	elements:
		'.content-name': '$title'
		'.content-cell-tags': '$tags'
		'.content-cell-date': '$date'

	render: =>
		# Prepare
		{item, $el, $title, $tags, $date} = @

		# Apply
		@point(
			item: item
			itemAttributes: ['title', 'name', 'relativePath']
			element: $title
			elementSetter: ({$el}) ->
				title = item.get('title') or item.get('name')
				relativePath = item.get('relativePath')
				if title
					$el.text(title)
					$el.append('<br>'+relativePath)
				else
					$el.text(relativePath)
		).bind()

		@point(
			item: item
			itemAttributes: ['tags']
			element: $tags
			elementSetter: ({$el, value}) ->
				$el.text (value or []).join(', ') or ''
		).bind()

		@point(
			item: item
			itemAttributes: ['date']
			element: $date
			elementSetter:({$el, value}) ->
				$date.text value?.toLocaleDateString() or ''
		).bind()

		# Chain
		@

# Export
module.exports = {FileEditItem, FileListItem}
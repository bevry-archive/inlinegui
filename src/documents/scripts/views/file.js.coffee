# Import
CodeMirror = window.CodeMirror
_ = window._
$ = window.$
moment = require('moment')
{View} = require('./base')

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

		@point(item).attributes('layout').to($layout).bind()
		@point(item).attributes('author').to($author).bind()
		@point(item).attributes('source').to($source).bind()
		@point(item).attributes('title', 'name', 'filename').to($title).update().bind()

		@point(item)
			.attributes('url')
			.to($previewbar)
			.using ({$el, item}) ->
				$el.attr('src': item.get('site').get('url')+item.get('url'))
			.bind()

		@point(item)
			.attributes('date')
			.to($date)
			.using ({$el, value}) ->
				if value?
					$el.val moment(value).format('YYYY-MM-DD')
			.bind()

		# Editor
		@editor = CodeMirror.fromTextArea($source.get(0), {
			mode: item.get('contentType')
		})

		# Chain
		@

	cancel: (opts={}, next) ->
		opts.next ?= next  if next
		@item.reset(opts)
		opts.next?()
		@

	save: (opts={}, next) ->
		opts.next ?= next  if next
		@item.sync(opts)
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
		@point(item)
			.attributes('title', 'name', 'relativePath')
			.to($title)
			.using ({$el, item}) ->
				title = item.get('title') or item.get('name')
				relativePath = item.get('relativePath')
				if title
					$el.text(title)
					$el.append('<br>'+relativePath)
				else
					$el.text(relativePath)
			.bind()

		@point(item)
			.attributes('tags')
			.to($tags)
			.using ({$el, value}) ->
				$el.text (value or []).join(', ') or ''
			.bind()

		@point(item)
			.attributes('date')
			.to($date)
			.using ({$el, value}) ->
				$date.text value?.toLocaleDateString() or ''
			.bind()

		# Chain
		@

# Export
module.exports = {FileEditItem, FileListItem}
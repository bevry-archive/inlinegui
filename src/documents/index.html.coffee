---
layout: 'default'
title: 'Inline GUI'
---

aside '.app.page-active.mainbar-active', ->
	aside '.loadbar', ->

	nav '.navbar', ->
		span '.left', ->
			span '.link.link-site', ->
				text 'Site'
				span '.switch', ->

			span '.link.link-page', ->
				text 'Page'
				span '.switch', ->

		span '.right', ->
			span '.status', ->
				'Changes saved at 10:41am'

			span '.button.button-save', 'data-loadclassname':'save', ->
				span '.active-text', ->
					'Saving...'
				span '.inactive-text', ->
					'Save'

			span '.button.button-cancel', 'data-loadclassname':'cancel', ->
				span '.active-text', ->
					'Cancelling...'
				span '.inactive-text', ->
					'Cancel'

			span '.button.button-meta', ->
				span '.icon.icon-info', ->

			span '.button.button-source', ->
				span '.icon.icon-code', ->
				#span '.icon.icon-reorder', ->
				#span '.icon.icon-info-sign', ->
				#span '.icon.icon-cog', ->
				#span '.icon.icon-code', ->
				#span '.icon.icon-list', ->

	section '.mainbar', ->
		header ->
			span '.title', ->
				'Page Settings'

		div '.body', ->

			div '.content-table', ->
				div '.content-row.content-row-header', ->
					div '.content-cell.content-title', ->
						'Title'
					div '.content-cell.content-buttons', ->
						''
					div '.content-cell.content-tags', ->
						'Tags'
					div '.content-cell.content-date', ->
						'Date'
				for file in @getCollection('database').toJSON()
					div '.content-row', ->
						div '.content-cell.content-title', ->
							file.name
						div '.content-cell.content-buttons', ->
							span '.button.button-edit', ->
								span '.icon.icon-edit', ->
								text 'Edit'
							span '.button.button-delete', ->
								span '.icon.icon-trash', ->
								text 'Delete'
						div '.content-cell.content-tags', ->
							file.tags?.join(', ')
						div '.content-cell.content-date', ->
							file.date.toLocaleDateString()

			div '.field.field-title', ->
				label ->
					'Title'
				input type:'text', ->

			div '.field.field-date', ->
				label ->
					'Publish Date'
				input type:'date', ->

			div '.field.field-author', ->
				label ->
					'Author'
				select ->
					option -> 'Benjamin Lupton'

	iframe '.sitebar', src:'/site.html', ->

---
layout: 'default'
title: 'Inline GUI'
---

aside '.loadbar', ->

aside '.app.page', ->
	nav '.topbar', ->
		span '.links', ->
			span '.site.link', ->
				text 'Site'
				span '.switch', ->

			span '.page.link.active', ->
				text 'Page'
				span '.switch', ->

		span '.status', ->
			'Changes saved at 10:41am'

		span '.buttons', ->
			span '.save.button', 'data-loadclassname':'save', ->
				span '.active-text', ->
					'Saving...'
				span '.inactive-text', ->
					'Save'

			span '.cancel.button', 'data-loadclassname':'cancel', ->
				span '.active-text', ->
					'Cancelling...'
				span '.inactive-text', ->
					'Cancel'

			span '.toggle', ->
				span '.icon.icon-chevron-down', ->

	section '.main', ->
		div '.container', ->
			header ->
				span '.title', ->
					'Page Settings'

			div '.body', ->

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

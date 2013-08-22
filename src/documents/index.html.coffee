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

			span '.button.button-toggle', ->
				span '.icon.icon-chevron-down', ->

	section '.mainbar', ->
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
				select ->
					option -> 'Benjamin Lupton'

	iframe '.sitebar', src:'/site.html', ->

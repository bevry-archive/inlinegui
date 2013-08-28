---
layout: 'default'
title: 'Inline GUI'
---

aside '.app', ->
	aside '.loadbar', ->

	section '.loginbar.mainbar', ->

		img '.button.button-login', alt:'Login', src:'/images/login.png', width:'95px', height:'25px', ->

	section '.sitesbar.mainbar', ->
		header ->
			span '.title', ->
				'Sites'

		div '.body', ->

			div '.content-table.sites', ->
				div '.content-row.content-row-header', ->
					div '.content-cell.content-cell-name', ->
						'Location'
				div '.content-row.content-row-site', ->
					div '.content-cell.content-cell-name', ->
						span '.content-name', title:'Open site', ->
							'http://localhost:9778'

	nav '.navbar', ->
		span '.left', ->
			span '.link.link-site', ->
				text 'Admin'

			span '.link.link-page.show-page', ->
				text 'Page'

		span '.right.show-page', ->
			#span '.status', ->
			#	'Changes saved at 10:41am'

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

			span '.toggle.toggle-source', ->
				span '.icon.icon-code', ->

			span '.toggle.toggle-meta', ->
				span '.icon.icon-info', ->
				#span '.icon.icon-reorder', ->
				#span '.icon.icon-info-sign', ->
				#span '.icon.icon-cog', ->
				#span '.icon.icon-code', ->
				#span '.icon.icon-list', ->

			span '.toggle.toggle-preview', ->
				span '.icon.icon-globe', ->
				#span '.icon.icon-eye-open', ->

	section '.sitebar.mainbar.show-site', ->
		header ->
			span '.title', ->
				'Database Listing'

		div '.body', ->

			div '.content-table.files', ->
				div '.content-row.content-row-header', ->
					div '.content-cell.content-cell-name', ->
						'Title'
					div '.content-cell.content-cell-tags', ->
						'Tags'
					div '.content-cell.content-cell-date', ->
						'Date'
				div '.content-row.content-row-file', ->
					div '.content-cell.content-cell-name', ->
						span '.content-name', title:'Open file', ->
							'File title'
						span '.content-buttons', ->
							span '.button.button-edit', title:'Edit file', ->
								span '.icon.icon-edit', ->
								text 'Edit'
							span '.button.button-delete', title:'Delete file', ->
								span '.icon.icon-trash', ->
								text 'Delete'
					div '.content-cell.content-cell-tags', ->
						'File tags'
					div '.content-cell.content-cell-date', ->
						'File date'

	section '.editbar.show-page', ->
		section '.sourcebar.mainbar', ->
			header '.title', ->
				'Page Source'

			div '.body', ->
				textarea '.file-source', ->

		section '.metabar.mainbar', ->
			header '.title', ->
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

		iframe '.previewbar', ->

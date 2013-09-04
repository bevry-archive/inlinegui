---
layout: 'default'
title: 'Inline GUI'
---

aside '.app', ->
	aside '.loadbar', ->

	nav '.menu', ->
		span '.left', ->
			span '.link.link-admin', ->
				text 'Admin'

			span '.link.link-site', ->
				text 'Site'

			span '.link.link-page', ->
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

			span '.toggle.toggle-preview', ->
				span '.icon.icon-globe', ->

	section '.login.modal.main.show-login', ->
		img '.button.button-login', alt:'Login', src:'/images/login.png', width:'95px', height:'25px', ->

	section '.site-add.modal.main.show-admin', ->
		header ->
			span '.title', -> 'Add Site'

		div '.body', ->
			form '.site-add-form', action:'', method:'PUT', ->
				div '.field.field-url', ->
					label -> 'Site URL'
					input type:'text', value:'http://localhost:9778', ->

				div '.field.field-token', ->
					label -> 'Security Token'
					input type:'text', ->

				div '.field.field-name', ->
					label -> 'Site Name'
					input type:'text', ->

				input type:'submit', value:'Submit'


	section '.site-list.main.show-admin', ->
		header ->
			span '.title', ->
				'Sites'

			ul '.button.button-add', ->
				li '.button-add-site', ->
					text 'Add Site'
					span '.icon.icon-plus', ->

		div '.body', ->
			div '.content-table.sites', ->
				div '.content-row.content-row-header', ->
					div '.content-cell.content-cell-name', ->
						'Location'

				div '.content-row.content-row-site', 'data-site':1, ->
					div '.content-cell.content-cell-name', ->
						span '.content-name', title:'Open site', ->
							'http://localhost:9778'

	section '.page-list.main.show-site', ->
		header ->
			span '.title', ->
				'Database Listing'

			ul '.button.button-add.button-drop', ->
				li ->
					text 'Add new'
					span '.icon.icon-plus', ->
				li '.button-add-document', -> 'Document'
				li '.button-add-upload', -> 'Upload'

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

	section '.page-edit.show-page', ->
		section '.page-source.main', ->
			header '.title', ->
				'Page Source'

			div '.body', ->
				textarea '.file-source', ->

		section '.page-meta.main', ->
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

		iframe '.page-preview', ->

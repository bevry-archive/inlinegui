# The DocPad Configuration File
# It is simply a CoffeeScript Object which is parsed by CSON
docpadConfig = {

	# =================================
	# Template Data
	# These are variables that will be accessible via our templates
	# To access one of these within our templates, refer to the FAQ: https://github.com/bevry/docpad/wiki/FAQ

	templateData:

		# Specify some site properties
		site:
			# The production url of our website
			url: "http://webwrite.github.io/inlinegui/"

			# Here are some old site urls that you would like to redirect from
			oldUrls: [
				'www.website.com',
				'website.herokuapp.com'
			]

			# The default title of our website
			title: "Inline GUI by Web Write"

			# The website description (for SEO)
			description: """
				A decoupled Inline GUI/CMS for any backend!
				"""

			# The website keywords (for SEO) separated by commas
			keywords: """
				inline, gui, web write, contenteditable, html5, cms, decoupled, backend agnostic
				"""

			# The website's styles
			styles: [
				'/vendor/normalize.css'
				'/vendor/h5bp.css'

				'/vendor/codemirror/codemirror.css'

				'/styles/style.css'
			]

			# The website's scripts
			scripts: [
				'/vendor/log.js'
				'/vendor/modernizr.js'
				'/vendor/jquery.js'

				'/vendor/underscore.js'
				'/vendor/backbone.js'
				'/vendor/backbone.localStorage.js'
				'/vendor/query-engine.js'

				'/vendor/spine/lib/spine.js'
				'/vendor/spine/lib/route.js'

				'/vendor/codemirror/codemirror.js'

				'//login.persona.org/include.js'

				'/scripts/script.js'
			]


		# -----------------------------
		# Helper Functions

		# Get the prepared site/document title
		# Often we would like to specify particular formatting to our page's title
		# we can apply that formatting here
		getPreparedTitle: ->
			# if we have a document title, then we should use that and suffix the site's title onto it
			if @document.title
				"#{@document.title} | #{@site.title}"
			# if our document does not have it's own title, then we should just use the site's title
			else
				@site.title

		# Get the prepared site/document description
		getPreparedDescription: ->
			# if we have a document description, then we should use that, otherwise use the site's description
			@document.description or @site.description

		# Get the prepared site/document keywords
		getPreparedKeywords: ->
			# Merge the document keywords with the site keywords
			@site.keywords.concat(@document.keywords or []).join(', ')


	# =================================
	# DocPad Events

	# Here we can define handlers for events that DocPad fires
	# You can find a full listing of events on the DocPad Wiki
	events:

		# Render Document
		renderDocument: (opts) ->
			return  if 'development' in @docpad.getEnvironments()
			if opts.extension is 'html'
				siteUrl = @docpad.getConfig().templateData.site.url.replace(/\/+$/, '')
				opts.content = opts.content.replace(/(['"])\/([^\/])/g, "$1#{siteUrl}/$2")

		# Server Extend
		# Used to add our own custom routes to the server before the docpad routes are added
		serverExtend: (opts) ->
			# Prepare
			docpad = @docpad

			# CORS
			opts.server.use (req,res,next) ->
				res.header('Access-Control-Allow-Origin', '*');
				res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
				res.header('Access-Control-Allow-Headers', 'Content-Type,X-Requested-With');
				return next()

			# As we are now running in an event,
			# ensure we are using the latest copy of the docpad configuraiton
			# and fetch our urls from it
			latestConfig = docpad.getConfig()
			oldUrls = latestConfig.templateData.site.oldUrls or []
			newUrl = latestConfig.templateData.site.url

			# Redirect any requests accessing one of our sites oldUrls to the new site url
			opts.server.use (req,res,next) ->
				if req.headers.host in oldUrls
					res.redirect(newUrl+req.url, 301)
				else
					next()

}

# Export our DocPad Configuration
module.exports = docpadConfig
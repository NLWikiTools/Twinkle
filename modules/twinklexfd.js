// <nowiki>

/** ***************************************************************************************************
 * WARNING: This file is synced with a GitHub-repo. Please make any changes to this file over there. *
 * Any local changes might be overwritten the next time this file is updated.                        *
 *                                                                                                   *
 * LET OP: Dit bestand is gekoppeld aan een GitHub-repo. Gelieve alle bewerkingen daar uitvoeren.    *
 * Locale bewerkingen worden mogelijk overschreven bij de volgende update.                           *
 *                                                                                                   *
 * https://github.com/NLWikiTools/Twinkle/blob/master/modules/twinklexfd.js                          *
 **************************************************************************************************** */

(function($) {


/*
	 ****************************************
	 *** twinklexfd.js: XFD module
	 ****************************************
	 * Mode of invocation:     Tab ("XFD")
	 * Active on:              Existing, non-special pages, except for file pages with no local (non-Commons) file which are not redirects
	 */

Twinkle.xfd = function twinklexfd() {
	// Disable on:
	// * special pages
	// * non-existent pages
	// * files on Commons, whether there is a local page or not (unneeded local pages of files on Commons are eligible for CSD F2, or R4 if it's a redirect)
	if (mw.config.get('wgNamespaceNumber') < 0 || !mw.config.get('wgArticleId') || (mw.config.get('wgNamespaceNumber') === 6 && document.getElementById('mw-sharedupload'))) {
		return;
	}

	var tooltip = 'Maak een beoordelingsnominatie aan';
	Twinkle.addPortletLink(Twinkle.xfd.callback, 'TBx', 'tw-xfd', tooltip);
};

var utils = {
	/**
		 * Remove namespace name from title if present
		 * Exception-safe wrapper around mw.Title
		 * @param {string} title
		 */
	stripNs: function(title) {
		var title_obj = mw.Title.newFromUserInput(title);
		if (!title_obj) {
			return title; // user entered invalid input; do nothing
		}
		return title_obj.getNameText();
	},

	/**
		 * Add namespace name to page title if not already given
		 * CAUTION: namespace name won't be added if a namespace (*not* necessarily
		 * the same as the one given) already is there in the title
		 * @param {string} title
		 * @param {number} namespaceNumber
		 */
	addNs: function(title, namespaceNumber) {
		var title_obj = mw.Title.newFromUserInput(title, namespaceNumber);
		if (!title_obj) {
			return title;  // user entered invalid input; do nothing
		}
		return title_obj.toText();
	},

	/**
		 * Provide Wikipedian TLA style: AfD, RfD, CfDS, RM, SfD, etc.
		 * @param {string} venue
		 * @returns {string}
		 */
	toTLACase: function(venue) {
		return venue
			.toString()
		// Everybody up, inclduing rm and the terminal s in cfds
			.toUpperCase()
		// Lowercase the central f in a given TLA and normalize sfd-t and sfr-t
			.replace(/(.)F(.)(?:-.)?/, '$1f$2');
	}
};

Twinkle.xfd.currentRationale = null;

// error callback on Morebits.status.object
Twinkle.xfd.printRationale = function twinklexfdPrintRationale() {
	if (Twinkle.xfd.currentRationale) {
		Morebits.status.printUserText(Twinkle.xfd.currentRationale, 'Je nominatiereden wordt hieronder weergegeven, welke je kunt kopiëren-en-plakken naar een nieuw TBx-scherm  voor als je opnieuw wil beginnen:');
		// only need to print the rationale once
		Twinkle.xfd.currentRationale = null;
	}
};

Twinkle.xfd.callback = function twinklexfdCallback() {
	var Window = new Morebits.simpleWindow(700, 400);
	Window.setTitle('Maak verwijdernominatie (TBx)');
	Window.setScriptName('Twinkle');
	Window.addFooterLink('Over verwijdernominaties', 'WP:XFD');
	Window.addFooterLink('TBx voorkeuren', 'WP:TW/PREF#xfd');
	Window.addFooterLink('Twinkle help', 'WP:TW/DOC#xfd');

	var form = new Morebits.quickForm(Twinkle.xfd.callback.evaluate);
	var categories = form.append({
		type: 'select',
		name: 'venue',
		label: 'Locatie voor nominatie:',
		tooltip: 'Indien ingeschakeld, wordt standaard de relevante naamruimte geselecteerd. In veel gevallen is deze standaard keuze de meest geschikte keuze.',
		event: Twinkle.xfd.callback.change_category
	});
	var namespace = mw.config.get('wgNamespaceNumber');

	categories.append({
		type: 'option',
		label: 'TBP (Te Beoordelen Pagina\'s)',
		selected: namespace === 0,  // Main namespace
		value: 'afd'
	});
	categories.append({
		type: 'option',
		label: 'TBS (Te Beoordelen Sjablonen)',
		selected: namespace === 10,  // Template namespace
		value: 'tfd'
	});
	categories.append({
		type: 'option',
		label: 'TBC (Te Beoordelen Categorieën)',
		selected: namespace === 14,  // Category namespace
		value: 'cfd'
	});

	form.append({
		type: 'div',
		id: 'wrong-venue-warn',
		style: 'color: red; font-style: italic'
	});

	form.append({
		type: 'field',
		label: 'Work area',
		name: 'work_area'
	});

	form.append({
		type: 'checkbox',
		list: [
			{
				label: 'Breng aanmaker op de hoogte (indien mogelijk)',
				value: 'notify',
				name: 'notifycreator',
				tooltip: 'Een mededeling van nominatie wordt op de overlegpagina van de aanmaker geplaatst.',
				checked: true
			}
		]
	});

	var previewlink = document.createElement('a');
	$(previewlink).click(function() {
		Twinkle.xfd.callbacks.preview(result);  // |result| is defined below
	});
	previewlink.style.cursor = 'pointer';
	previewlink.textContent = 'Voorvertoning';
	form.append({ type: 'div', id: 'xfdpreview', label: [ previewlink ] });
	form.append({ type: 'div', id: 'twinklexfd-previewbox', style: 'display: none' });

	form.append({ type: 'submit' });

	var result = form.render();
	Window.setContent(result);
	Window.display();
	result.previewer = new Morebits.wiki.preview($(result).find('div#twinklexfd-previewbox').last()[0]);

	// We must init the controls
	var evt = document.createEvent('Event');
	evt.initEvent('change', true, true);
	result.venue.dispatchEvent(evt);
};

Twinkle.xfd.callback.wrongVenueWarning = function twinklexfdWrongVenueWarning(venue) {
	var text = '';
	var namespace = mw.config.get('wgNamespaceNumber');

	switch (venue) {
		case 'afd':
			if (namespace === 10 || namespace === 14) {
				text = 'De TBP wordt NIET voor sjablonen of categorieën gebruikt.';
			}
			break;
		case 'tfd':
			if (namespace !== 10) {
				text = 'De TBS wordt ALLEEN voor sjablonen gebruikt.';
			}
			break;
		case 'cfd':
			if (namespace !== 14) {
				text = 'De TBC wordt ALLEEN voor categorieën gebruikt.';
			}
			break;
		default:
			break;
	}

	$('#wrong-venue-warn').text(text);

};

Twinkle.xfd.callback.change_category = function twinklexfdCallbackChangeCategory(e) {
	var value = e.target.value;
	var form = e.target.form;
	var old_area = Morebits.quickForm.getElements(e.target.form, 'work_area')[0];
	var work_area = null;

	var oldreasontextbox = form.getElementsByTagName('textarea')[0];
	var oldreason = oldreasontextbox ? oldreasontextbox.value : '';

	var appendReasonBox = function twinklexfdAppendReasonBox() {
		work_area.append({
			type: 'textarea',
			name: 'reason',
			label: 'Reden: ',
			value: oldreason,
			tooltip: 'Je kunt wikiopmaak gebruiken in je reden.'
		});
	};

	Twinkle.xfd.callback.wrongVenueWarning(value);

	form.previewer.closePreview();

	switch (value) {
		case 'afd':
			work_area = new Morebits.quickForm.element({
				type: 'field',
				label: 'Artikel nomineren voor verwijdering',
				name: 'work_area'
			});

			var sjabloon_select = work_area.append({
				type: 'select',
				label: 'Nominatie categorie:',
				name: 'sjabloon'
			});
			sjabloon_select.append({ type: 'option', label: 'Algemene nominatie', value: 'verwijderen', selected: true });
			sjabloon_select.append({ type: 'option', label: 'Werk in uitvoering', value: 'wiu'});
			sjabloon_select.append({ type: 'option', label: 'Niet encyclopedisch', value: 'ne' });
			sjabloon_select.append({ type: 'option', label: 'Woordenboekdefinitie', value: 'wb' });
			sjabloon_select.append({ type: 'option', label: 'Promotionele uiting', value: 'reclame' });
			sjabloon_select.append({ type: 'option', label: 'Schending auteursrechten', value: 'auteur' });

			if ((mw.config.get('wgNamespaceNumber') === 2 /* Gebruiker: */ || mw.config.get('wgNamespaceNumber') === 3 /* Overleg gebruiker: */) && mw.config.exists('wgRelevantUserName')) {
				work_area.append({
					type: 'checkbox',
					list: [
						{
							label: 'Breng eigenaar van paginaruimte op de hoogte (indien dit niet je eigen paginaruimte is)',
							value: 'notifyuserspace',
							name: 'notifyuserspace',
							checked: true
						}
					]
				});
			}
			appendReasonBox();
			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;

		case 'tfd':
			work_area = new Morebits.quickForm.element({
				type: 'field',
				label: 'Sjabloon nomineren voor verwijdering',
				name: 'work_area'
			});

			// Weghalen bij activatie
			work_area.append({
				type: 'div',
				label: 'Om technische reden is het nomineren van sjablonen middels Twinkle (nog) niet mogelijk. Meld uw nominatie handmatig aan op [[WP:TBS]].',
				name: 'work_area'
			});
			/* Geeft problemen met weeknummers, voor nu uitgeschakeld
					appendReasonBox();
				*/
			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;

		case 'cfd':
			work_area = new Morebits.quickForm.element({
				type: 'field',
				label: 'Categorie nomineren voor verwijdering',
				name: 'work_area'
			});

			// Weghalen bij activatie
			work_area.append({
				type: 'div',
				label: 'Om technische reden is het nomineren van categorieën middels Twinkle (nog) niet mogelijk. Meld uw nominatie handmatig aan op [[WP:TBC]].',
				name: 'work_area'
			});
			/* Geeft problemen met weeknummers, voor nu uitgeschakeld
					appendReasonBox();
				*/
			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;

		default:
			work_area = new Morebits.quickForm.element({
				type: 'field',
				label: 'Nomineer niets',
				name: 'work_area'
			});
			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;
	}

	// Return to checked state when switching, but no creator notification for CFDS or RM
	form.notifycreator.disabled = value === 'cfds' || value === 'rm';
	form.notifycreator.checked = !form.notifycreator.disabled;
};


Twinkle.xfd.callbacks = {
	// Requires having the tag text (params.tagText) set ahead of time
	autoEditRequest: function(pageobj, params) {
		var talkName = new mw.Title(pageobj.getPageName()).getTalkPage().toText();
		if (talkName === pageobj.getPageName()) {
			pageobj.getStatusElement().error('Pagina beveiligd, nominatie sjabloon kan daarom niet geplaatst worden. Nominatie afgebroken');
		} else {
			pageobj.getStatusElement().warn('Pagina beveiligd, bewerking aangevraagd');

			var editRequest = '{{subst:Xfd edit protected|page=' + pageobj.getPageName() +
					'|discussion=' + params.discussionpage + (params.venue === 'rfd' ? '|rfd=yes' : '') +
					'|tag=<nowiki>' + params.tagText + '\u003C/nowiki>}}'; // U+003C: <

			var talk_page = new Morebits.wiki.page(talkName, 'Bewerkingsverzoek op overlegpagina plaatsen');
			talk_page.setNewSectionTitle('Bewerkingsverzoek om ' + utils.toTLACase(params.venue) + ' te nomineren');
			talk_page.setNewSectionText(editRequest);
			talk_page.setCreateOption('recreate');
			talk_page.setWatchlist(Twinkle.getPref('xfdWatchPage'));
			talk_page.setFollowRedirect(false);
			talk_page.setChangeTags(Twinkle.changeTags);
			talk_page.setCallbackParameters(params);
			talk_page.newSection(null, function() {
				talk_page.getStatusElement().warn('Verzoek plaatsen mislukt, misschien is de overlegpagina ook beveiligd');
			});
		}
	},
	getDiscussionWikitext: function(venue, params) {
		var text;
		if (venue === 'afd') {
			text = '\n== [[' + Morebits.pageNameNorm + ']] ==\n';
			text += '{{tbp-links|' + Morebits.pageNameNorm + '}}\n';
			switch (params.sjabloon) {
				case 'wiu':
					text += '\'\'\'[[Wikipedia:Werk in uitvoering|WIU]]\'\'\' &ndash; ' + params.reason + ' &ndash; ~~~~';
					break;
				case 'ne':
					text += '\'\'\'[[Wikipedia:Relevantie|NE]]\'\'\' &ndash; ' + params.reason + ' &ndash; ~~~~';
					break;
				case 'wb':
					text += '\'\'\'[[Wikipedia:Woordenboekdefinitie|WB]]\'\'\' &ndash; ' + params.reason + ' &ndash; ~~~~';
					break;
				case 'reclame':
					text += '\'\'\'[[Wikipedia:Neutraal standpunt|POV]]\'\'\' &ndash; ' + params.reason + ' &ndash; ~~~~';
					break;
				case 'auteur':
					text += '\'\'\'[[Wikipedia:Auteursrechten|AUT]]\'\'\' &ndash; ' + params.reason + ' &ndash; ~~~~';
					break;
				default:
					text += params.reason + ' &ndash; ~~~~';
					break;
			}
			return text;
		} else if (venue === 'cfd') {
			text = '{{categorieweg';
			text += '|1=' + params.reason;
			text += '|2={{subst:LOCALYEAR}}|3={{subst:LOCALMONTH}}|4={{subst:LOCALDAY2}}}}';
			return text;
		} else if (venue === 'tfd') {
			text = '{{sjabloonweg';
			text += '|1=' + params.reason;
			text += '|2={{subst:LOCALYEAR}}|3={{subst:LOCALMONTH}}|4={{subst:LOCALDAY2}}}}';
			return text;
		}
	},
	showPreview: function(form, venue, params) {
		var templatetext = Twinkle.xfd.callbacks.getDiscussionWikitext(venue, params);
		form.previewer.beginRender(templatetext, 'WP:TW'); // Force wikitext
	},
	preview: function(form) {
		// venue, reason, xfdcat, tfdtarget, cfdtarget, cfdtarget2, cfdstarget, delsortCats, newname
		var params = Morebits.quickForm.getInputData(form);

		var venue = params.venue;

		// Remove CfD or TfD namespace prefixes if given
		if (params.tfdtarget) {
			params.tfdtarget = utils.stripNs(params.tfdtarget);
		} else if (params.cfdtarget) {
			params.cfdtarget = utils.stripNs(params.cfdtarget);
			if (params.cfdtarget2) {
				params.cfdtarget2 = utils.stripNs(params.cfdtarget2);
			}
		} else if (params.cfdstarget) { // Add namespace if not given (CFDS)
			params.cfdstarget = utils.addNs(params.cfdstarget, 14);
		}

		if (venue === 'cfd') { // Swap in CfD subactions
			Twinkle.xfd.callbacks.showPreview(form, params.xfdcat, params);
		} else {
			Twinkle.xfd.callbacks.showPreview(form, venue, params);
		}
	},
	/**
		 * Unified handler for sending {{Xfd notice}} notifications
		 * Also handles userspace logging
		 * @param {object} params
		 * @param {string} notifyTarget The user or page being notified
		 * @param {boolean} [noLog=false] Whether to skip logging to userspace
		 * XfD log, especially useful in cases in where multiple notifications
		 * may be sent out (MfD, TfM, RfD)
		 * @param {string} [actionName] Alternative description of the action
		 * being undertaken. Required if not notifying a user talk page.
		 */
	notifyUser: function(params, notifyTarget, noLog, actionName) {
		// Ensure items with User talk or no namespace prefix both end
		// up at user talkspace as expected, but retain the
		// prefix-less username for addToLog
		notifyTarget = mw.Title.newFromText(notifyTarget, 3);
		var targetNS = notifyTarget.getNamespaceId();
		var usernameOrTarget = notifyTarget.getRelativeText(3);
		notifyTarget = notifyTarget.toText();

		var deferred = $.Deferred();

		if (targetNS === 3) {
			// Disallow warning yourself
			if (usernameOrTarget === mw.config.get('wgUserName')) {
				Morebits.status.warn('Jij (' + usernameOrTarget + ') hebt deze pagina aangemaakt; notificatie overgeslagen');

				// if we thought we would notify someone but didn't,
				// then jump to logging.
				Twinkle.xfd.callbacks.addToLog(params, null);
				return;
			}

			// Check if a nobots is present on the user talk page
			var api = new mw.Api();
			api.get({
				format: 'json',
				action: 'query',
				prop: 'revisions',
				titles: 'Overleg gebruiker:' + usernameOrTarget,
				rvprop: 'content'
			}).done(function (data) {
				var pages = data.query.pages;
				var pageId = Object.keys(pages)[0];

				if (pageId === "-1") {
					// Todo: use this to appent {{welkom}}
					deferred.resolve();
				}

				var pageContent = pages[pageId].revisions[0]['*'];

				if (pageContent) {
					var hasNoBots = pageContent.includes('{{nobots}}');
					var hasBotsAllowNone = pageContent.includes('{{bots|allow=none}}');
					var hasBotsDenyAll = pageContent.includes('{{bots|deny=all}}');
					var hasBotsDenyTwinkle = /{{bots\|deny=.*twinkle.*}}/i.test(pageContent);

					if (hasNoBots || hasBotsAllowNone || hasBotsDenyAll || hasBotsDenyTwinkle) {
						Morebits.status.warn('Notificatie overgeslagen omdat ' + usernameOrTarget + ' meldingen heeft uitgezet middels {{nobots}}');
						Twinkle.xfd.callbacks.addToLog(params, null);
						deferred.reject();
						return;
					}
				}
				deferred.resolve();
			}).fail(function() {
				deferred.resolve();
			});
			// Default is notifying the initial contributor, but MfD also
			// notifies userspace page owner
			actionName = actionName || 'Verwittig originele aanmaker (' + usernameOrTarget + ')';
		} else {
			// If targetNS is not 3, resolve the deferred immediately
			deferred.resolve();
		}

		$.when(deferred).done(function() {
			var notifytext = '\n== Beoordelingsnominatie van ' + Morebits.pageNameNorm + ' ==';
			notifytext += '\n{{subst:vvn|1=' + Morebits.pageNameNorm;
			notifytext += '|2={{subst:LOCALYEAR}}|3={{subst:LOCALMONTH}}|4={{subst:LOCALDAY2}}';
			notifytext += '|5=' + params.reason + '}} Met vriendelijke groet, ~~~~';

			// Link to the venue; object used here rather than repetitive items in switch
			var editSummary = 'Mededeling: Nominatie van [[' + Morebits.pageNameNorm + ']] op [[' + params.discussionpage + ']].';

			var usertalkpage = new Morebits.wiki.page(notifyTarget, actionName);
			usertalkpage.setAppendText(notifytext);
			usertalkpage.setEditSummary(editSummary);
			usertalkpage.setChangeTags(Twinkle.changeTags);
			usertalkpage.setCreateOption('recreate');
			usertalkpage.setWatchlist(Twinkle.getPref('xfdWatchUser'));
			usertalkpage.setFollowRedirect(true, false);

			if (noLog) {
				usertalkpage.append();
			} else {
				usertalkpage.append(function onNotifySuccess() {
					// Don't treat RfD target or MfD userspace owner as initialContrib in log
					if (!params.notifycreator) {
						notifyTarget = null;
					}
					// add this nomination to the user's userspace log
					Twinkle.xfd.callbacks.addToLog(params, usernameOrTarget);
				}, function onNotifyError() {
					// if user could not be notified, log nomination without mentioning that notification was sent
					Twinkle.xfd.callbacks.addToLog(params, null);
				});
			}
		}).fail(function() {
            // If the deferred was rejected (i.e., blocking template found), we do nothing further
			console.log("Gadget-twinklexfd.js: Unexpected error during notification proces")
            return;
        });
	},
	addToLog: function(params, initialContrib) {
		if (!Twinkle.getPref('logXfdNominations') || Twinkle.getPref('noLogOnXfdNomination').indexOf(params.venue) !== -1) {
			return;
		}

		var usl = new Morebits.userspaceLogger(Twinkle.getPref('xfdLogPageName'));// , 'Adding entry to userspace log');

		usl.initialText =
				// eslint-disable-next-line no-useless-escape
				"Dit is een logboek voor alle [[Wikipedia:Te beoordelen pagina\'s|verwijdernominaties]] die door deze gebruiker met [[WP:TW|Twinkle]] zijn gemaakt.\n\n" +
				'Indien je dit logboek niet langer wil behouden, kun je het uitschakelen via het [[WP:Twinkle/Preferences|configuratiescherm]], ' +
				'en deze pagina nomineren voor directe verwijdering.' +
				(Morebits.userIsSysop ? '\n\nDit logboek bewaard niet jouw moderatorafhandeling van een TBP-nominatie!' : '');

		var editsummary = 'Loggen van beoordelingsnominatie nominatie van [[:' + Morebits.pageNameNorm + ']].';

		// If a logged file is deleted but exists on commons, the wikilink will be blue, so provide a link to the log
		var fileLogLink = mw.config.get('wgNamespaceNumber') === 6 ? ' ([{{fullurl:Special:Log|page=' + mw.util.wikiUrlencode(mw.config.get('wgPageName')) + '}} log])' : '';


		var appendText = '# [[:' + Morebits.pageNameNorm + ']]:' + fileLogLink + ' ' + 'Genomineerd op [[Wikipedia:Te beoordelen pagina\'s/Toegevoegd {{subst:LOCALYEAR}}{{subst:LOCALMONTH}}{{subst:LOCALDAY2}}|de TBP]]';

		switch (params.venue) {
			case 'cfd':
				appendText += ' (' + utils.toTLACase(params.xfdcat) + ')';
				if (params.cfdtarget) {
					var categoryOrTemplate = params.xfdcat.charAt(0) === 's' ? 'Sjabloon:' : ':Categorie:';
					appendText += '; ' + params.action + ' to [[' + categoryOrTemplate + params.cfdtarget + ']]';
					if (params.xfdcat === 'cfs' && params.cfdtarget2) {
						appendText += ', [[' + categoryOrTemplate + params.cfdtarget2 + ']]';
					}
				}
				break;
			default: // afd, tfd
				break;
		}

		if (initialContrib && params.notifycreator) {
			appendText += '; {{gebruiker|1=' + initialContrib + '}} genotificeerd';
		}
		appendText += ' ~~~~~';
		if (params.reason) {
			appendText += "\n#* '''Reden''': " + Morebits.string.formatReasonForLog(params.reason);
		}

		usl.changeTags = Twinkle.changeTags;
		usl.log(appendText, editsummary);
	},

	afd: {
		main: function(apiobj) {
			apiobj.getResponse();
			apiobj.params.discussionpage = 'Wikipedia:Te beoordelen pagina\'s'; // Een beetje een bodge, maar het werkt ish...

			Morebits.status.info('Discussie pagina: ', '[[' + apiobj.params.discussionpage + ']]');

			// Updating data for the action completed event
			Morebits.wiki.actionCompleted.redirect = Morebits.pageNameNorm;
			Morebits.wiki.actionCompleted.notice = 'Nominatie voltooid, pagina wordt herladen...';

			// Tagging article
			var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), 'Nominatiesjabloon aan artikel toevoegen ');
			wikipedia_page.setFollowRedirect(false);
			wikipedia_page.setChangeTags(Twinkle.changeTags); // Here to apply to triage
			wikipedia_page.setCallbackParameters(apiobj.params);
			wikipedia_page.load(Twinkle.xfd.callbacks.afd.taggingArticle);
		},
		// Tagging needs to happen before everything else: this means we can check if there is an AfD tag already on the page
		taggingArticle: function(pageobj) {
			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();
			var statelem = pageobj.getStatusElement();

			var date = new Morebits.date(pageobj.getLoadTime());
			var daypage = 'Wikipedia:Te beoordelen pagina\'s/Toegevoegd ' + date.format('YYYYMMDD', 'Europe/Berlin');

			if (!pageobj.exists()) {
				statelem.error('Het lijkt erop dat de pagina niet bestaat; misschien is de pagina al verwijderd?');
				return;
			}

			// Check for existing AfD tag, for the benefit of new page patrollers
			var textNoAfd = text.replace(/{{\s*(wiu|ne|wb|auteur|reclame|weg|weg2|verwijderen)(?:\s*\||\s*}})/ig, '');
			if (text !== textNoAfd) {
				if (confirm('Een TBP sjabloon is al gevonden op dit artikel. Misschien was iemand sneller.  \nKlik op OK om de nominatie te vervangen met jouw nominatie (niet verstandig), of Cancel om je nominatie af te breken.')) {
					text = textNoAfd;
				} else {
					statelem.error('Artikel al genomineerd, en je hebt gekozen jouw nominatie af te breken');
					window.location.reload();
					return;
				}
			}

			// Now we know we want to go ahead with it, trigger the other AJAX requests

			// Mark the page as curated/patrolled, if wanted
			if (Twinkle.getPref('markXfdPagesAsPatrolled')) {
				new Morebits.wiki.page(Morebits.pageNameNorm).triage();
			}

			// Start discussion page, will also handle pagetriage and delsort listings
			var wikipedia_page = new Morebits.wiki.page(daypage, 'Maak een verwijdernominatie aan');
			wikipedia_page.setFollowRedirect(true);
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.xfd.callbacks.afd.discussionPage);

			// Notification to first contributor
			if (params.notifycreator) {
				var thispage = new Morebits.wiki.page(mw.config.get('wgPageName'));
				thispage.setCallbackParameters(params);
				thispage.setLookupNonRedirectCreator(true); // Look for author of first non-redirect revision
				thispage.lookupCreation(function(pageobj) {
					Twinkle.xfd.callbacks.notifyUser(pageobj.getCallbackParameters(), pageobj.getCreator());
				});
				// or, if not notifying, add this nomination to the user's userspace log without the initial contributor's name
			} else {
				Twinkle.xfd.callbacks.addToLog(params, null);
			}

			params.tagText = '{{verwijderen|2={{subst:LOCALYEAR}}|3={{subst:LOCALMONTH}}|4={{subst:LOCALDAY2}}}}\n';

			if (pageobj.canEdit()) {
				// Remove some tags that should always be removed on AfD.
				// Test if there are speedy deletion-related templates on the article.
				var textNoSd = text.replace(/{{\s*(nuweg|delete)\s*(\|(?:{{[^{}]*}}|[^{}])*)?}}\s*/ig, '');
				if (text !== textNoSd && confirm('Een nuweg nominatie was gevonden op de pagina. Moet deze vervangen worden?')) {
					text = textNoSd;
				}

				// Insert tag after short description or any hatnotes
				var wikipage = new Morebits.wikitext.page(text);
				text = wikipage.insertAfterTemplates(params.tagText, Twinkle.hatnoteRegex).getText();

				pageobj.setPageText(text);
				pageobj.setEditSummary('Genomineerd voor beoordeling, zie [[' + daypage + ']].');
				pageobj.setWatchlist(Twinkle.getPref('xfdWatchPage'));
				pageobj.setCreateOption('nocreate');
				pageobj.save();
			} else {
				Twinkle.xfd.callbacks.autoEditRequest(pageobj, params);
			}
		},
		discussionPage: function(pageobj) {
			var params = pageobj.getCallbackParameters();

			pageobj.setAppendText(Twinkle.xfd.callbacks.getDiscussionWikitext('afd', params));
			pageobj.setEditSummary('Beoordelingsnominatie voor [[:' + Morebits.pageNameNorm + ']].');
			pageobj.setChangeTags(Twinkle.changeTags);
			pageobj.setWatchlist(Twinkle.getPref('xfdWatchDiscussion'));
			pageobj.append(function() {
				Twinkle.xfd.currentRationale = null;  // any errors from now on do not need to print the rationale, as it is safely saved on-wiki
			});
		}
	},


	tfd: {
		main: function() {
			/**
			 * Sjabloon nominaties voor nu uitgeschakeld, dus kill it!
			 * Template nominations are disabled for now, so kill it!
			 */
		}
	},

	cfd: {
		main: function() {
			/**
			 * Categorie nominaties voor nu uitgeschakeld, dus kill it!
			 * Category nominations are disabled for now, so kill it!
			 */
		}
	}
};



Twinkle.xfd.callback.evaluate = function(e) {
	var form = e.target;

	var params = Morebits.quickForm.getInputData(form);

	Morebits.simpleWindow.setButtonsEnabled(false);
	Morebits.status.init(form);

	Twinkle.xfd.currentRationale = params.reason;
	Morebits.status.onError(Twinkle.xfd.printRationale);

	var query, wikipedia_page, wikipedia_api;
	switch (params.venue) {

		case 'afd': // AFD
			query = {
				action: 'query',
				list: 'allpages',
				apprefix: 'Te Beoordelen Pagina\'s/' + Morebits.pageNameNorm,
				apnamespace: 4,
				apfilterredir: 'nonredirects',
				aplimit: 'max', // 500 is max for normal users, 5000 for bots and sysops
				format: 'json'
			};
			wikipedia_api = new Morebits.wiki.api('Artikel nomineren voor verwijdering', query, Twinkle.xfd.callbacks.afd.main);
			wikipedia_api.params = params;
			wikipedia_api.post();
			break;

		case 'tfd': // TFD
			if (params.tfdtarget) { // remove namespace name
				params.tfdtarget = utils.stripNs(params.tfdtarget);
			}

			// Modules can't be tagged, TfD instructions are to place on /doc subpage
			params.scribunto = mw.config.get('wgPageContentModel') === 'Scribunto';
			if (params.xfdcat === 'tfm') { // Merge
				// Tag this template/module
				if (params.scribunto) {
					wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName') + '/doc', 'Tagging this module documentation with merge tag');
					params.otherTemplateName = 'Module:' + params.tfdtarget;
				} else {
					wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), 'Tagging this template with merge tag');
					params.otherTemplateName = 'Sjabloon:' + params.tfdtarget;
				}
			} else { // delete
				if (params.scribunto) {
					wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName') + '/doc', 'Tagging module documentation with deletion tag');
				} else {
					wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), 'Tagging template with deletion tag');
				}
			}
			wikipedia_page.setFollowRedirect(true);  // should never be needed, but if the page is moved, we would want to follow the redirect
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.xfd.callbacks.tfd.main);
			break;


		case 'cfd':
			if (params.cfdtarget) {
				params.cfdtarget = utils.stripNs(params.cfdtarget);
			} else {
				params.cfdtarget = ''; // delete
			}
			if (params.cfdtarget2) { // split
				params.cfdtarget2 = utils.stripNs(params.cfdtarget2);
			}

			// Used for customized actions in edit summaries and the notification template
			var summaryActions = {
				'cfd': 'deletion',
				'sfd-t': 'deletion',
				'cfm': 'merging',
				'cfr': 'renaming',
				'sfr-t': 'renaming',
				'cfs': 'splitting',
				'cfc': 'conversion'
			};
			params.action = summaryActions[params.xfdcat];

			// Tagging category
			wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), 'Tagging category with ' + params.action + ' tag');
			wikipedia_page.setFollowRedirect(true); // should never be needed, but if the page is moved, we would want to follow the redirect
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.xfd.callbacks.cfd.main);
			break;

		default:
			alert('twinklexfd: unknown XFD discussion venue');
			break;
	}
};

Twinkle.addInitCallback(Twinkle.xfd, 'xfd');
})(jQuery);


// </nowiki>

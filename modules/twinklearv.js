// <nowiki>

/** ***************************************************************************************************
 * WARNING: This file is synced with a GitHub-repo. Please make any changes to this file over there. *
 * Any local changes might be overwritten the next time this file is updated.                        *
 *                                                                                                   *
 * LET OP: Dit bestand is gekoppeld aan een GitHub-repo. Gelieve alle bewerkingen daar uitvoeren.    *
 * Locale bewerkingen worden mogelijk overschreven bij de volgende update.                           *
 *                                                                                                   *
 * https://github.com/NLWikiTools/Twinkle/blob/master/modules/twinklearv.js                          *
 **************************************************************************************************** */

(function($) {

/*
 ****************************************
 *** twinklearv.js: ARV module
 ****************************************
 * Mode of invocation:     Tab ("ARV")
 * Active on:              Any page with relevant user name (userspace, contribs, etc.)
 */

Twinkle.arv = function twinklearv() {
	var username = mw.config.get('wgRelevantUserName');
	if (!username || username === mw.config.get('wgUserName')) {
		return;
	}

	var isIP = mw.util.isIPAddress(username, true);
	// Ignore ranges wider than the CIDR limit
	if (Morebits.ip.isRange(username) && !Morebits.ip.validCIDR(username)) {
		return;
	}
	var userType = isIP ? 'IP' + (Morebits.ip.isRange(username) ? ' subnet' : '') : 'gebruiker';

	Twinkle.addPortletLink(function() {
		Twinkle.arv.callback(username, isIP);
	}, 'Rapporteer', 'tw-arv', 'Rapporteer ' + userType);
};

Twinkle.arv.callback = function (uid, isIP) {
	var Window = new Morebits.simpleWindow(600, 500);
	Window.setTitle('Rapporteer gebruiker');
	Window.setScriptName('Twinkle');
	Window.addFooterLink('Blokkeer info', 'WP:Verzoekpagina voor moderatoren/RegBlok/Uitleg lang');
	Window.addFooterLink('Sokpop info', 'WP:SPM');
	Window.addFooterLink('Twinkle instellingen', 'WP:TW/PREF#arv');
	Window.addFooterLink('Twinkle help', 'WP:TW/DOC#arv');

	var form = new Morebits.quickForm(Twinkle.arv.callback.evaluate);
	var categories = form.append({
		type: 'select',
		name: 'category',
		label: 'Selecteer locatie van rapporteren: ',
		event: Twinkle.arv.callback.changeCategory
	});
	categories.append({
		type: 'option',
		label: 'WP:Regblok',
		value: 'regblok',
		disabled: isIP
	});
	categories.append({
		type: 'option',
		label: 'WP:IPBlok',
		value: 'ipblok',
		disabled: !isIP
	});
	categories.append({
		type: 'option',
		label: 'WP:Sokpop',
		value: 'sokpop'
	});

	form.append({
		type: 'div',
		label: '',
		style: 'color: red',
		id: 'twinkle-arv-blockwarning'
	});
	form.append({
		type: 'field',
		label: 'Work area',
		name: 'work_area'
	});
	form.append({ type: 'submit' });
	form.append({
		type: 'hidden',
		name: 'uid',
		value: uid
	});

	var result = form.render();
	Window.setContent(result);
	Window.display();

	// Check if the user is blocked, update notice
	var query = {
		action: 'query',
		list: 'blocks',
		bkprop: 'range|flags',
		format: 'json'
	};
	if (isIP) {
		query.bkip = uid;
	} else {
		query.bkusers = uid;
	}
	new Morebits.wiki.api('Controleren of gebruiker geblokeerd is ', query, function(apiobj) {
		var blocklist = apiobj.getResponse().query.blocks;
		if (blocklist.length) {
			// If an IP is blocked *and* rangeblocked, only use whichever is more recent
			var block = blocklist[0];
			var message = (isIP ? 'Dit IP-' + (Morebits.ip.isRange(uid) ? 'subnet' : 'adres') : 'Dit account') + ' is ' + (block.partial ? 'gedeeltelijk' : 'al') + ' geblokkeerd';
			// Start and end differ, range blocked
			message += block.rangestart !== block.rangeend ? ' als onderdeel van een rangeblock.' : '.';
			if (block.partial) {
				$('#twinkle-arv-blockwarning').css('color', 'black'); // Less severe
			}
			$('#twinkle-arv-blockwarning').text(message);
		}
	}).post();


	// We must init the
	var evt = document.createEvent('Event');
	evt.initEvent('change', true, true);
	result.category.dispatchEvent(evt);
};

Twinkle.arv.callback.changeCategory = function (e) {
	var value = e.target.value;
	var root = e.target.form;
	var old_area = Morebits.quickForm.getElements(root, 'work_area')[0];
	var work_area = null;

	switch (value) {
		case 'regblok':
		/* falls through */
		default:
			work_area = new Morebits.quickForm.element({
				type: 'field',
				label: 'Rapporteer geregistreerde gebruiker',
				name: 'work_area'
			});
			work_area.append({
				type: 'checkbox',
				name: 'arvtype',
				list: [
					{
						label: 'Doorgaand vandalisme na uitdelen laatste waarschuwing',
						value: 'final'
					},
					{
						label: 'Doorgaand vandalisme na zeer recente blokkade',
						value: 'postblock'
					},
					{
						label: 'Crosswiki vandaal',
						value: 'crosswiki'
					},
					{
						label: 'Ongewenste gebruikersnaam',
						value: 'og'
					},
					{
						label: 'Spambot',
						value: 'spambot'
					}
				]
			});
			work_area.append({
				type: 'textarea',
				name: 'reason',
				label: 'Opmerking: '
			});
			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;

		case 'ipblok':
			work_area = new Morebits.quickForm.element({
				type: 'field',
				label: 'Rapporteer IP gebruiker',
				name: 'work_area'
			});
			work_area.append({
				type: 'checkbox',
				name: 'arvtype',
				list: [
					{
						label: 'Doorgaand vandalisme na uitdelen laatste waarschuwing',
						value: 'final'
					},
					{
						label: 'Doorgaand vandalisme na zeer recente blokkade',
						value: 'postblock'
					},
					{
						label: 'Crosswiki vandaal',
						value: 'crosswiki'
					},
					{
						label: 'Spambot',
						value: 'spambot'
					}
				]
			});
			work_area.append({
				type: 'textarea',
				name: 'reason',
				label: 'Opmerking: '
			});
			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;

		case 'sokpop':
			work_area = new Morebits.quickForm.element({
				type: 'field',
				label: 'Rapporteer vermoedelijke sokpoppen',
				name: 'work_area'
			});
			work_area.append(
				{
					type: 'dyninput',
					name: 'sockpuppet',
					label: 'Sokpoppen',
					sublabel: 'Sokpop: ',
					tooltip: 'De gebruikersnaam van de sokpop zonder de "Gebruiker:" prefix. Meer dan 20 sokken? Doe het verzoek dan handmatig op WP:SOKPOP.',
					max: 20 // Limiteer o.b.v. beperking Sjabloon:Aanvraagcheckuser (bijgewerkt naar 20 na aanpassing sjabloon op 18 juli 2021)
				});
			work_area.append({
				type: 'textarea',
				label: 'Bewijs:',
				name: 'evidence',
				tooltip: 'Een sokpoppenonderzoek door een checkuser is een zeer ingrijpende procedure, daarom moet het aangeleverde bewijs duidelijk maken waarom een sokpoponderzoek noodzakelijk en gerechtvaardigd is. Bedenk ook dat het hebben van een sokpop op zichzelf niet verboden is, alleen het misbruik maken van sokpoppen is verboden.',
				required: true
			});
			work_area.append({
				type: 'checkbox',
				list: [ {
					label: 'Breng gebruikers op de hoogte van het onderzoek',
					name: 'notify',
					tooltip: 'Het op de hoogte brengen van de gebruiker is niet verplicht, en kan in veel gevallen averechts werken. Aan de andere kant is het op de hoogte brengen wel zo beleefd, zeker als je uit gaat van goede wil. De afweging is daarom aan jou als melder.'
				} ]
			});
			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;
	}
};

Twinkle.arv.callback.evaluate = function(e) {
	var form = e.target;
	form.sockpuppet = undefined;
	var reason = '';
	var comment = '';
	if (form.reason) {
		comment = form.reason.value;
	}
	var uid = form.uid.value;

	var types;
	var aivPage;
	switch (form.category.value) {

		// WP:REGBLOK
		case 'regblok':
			/* falls through */
		default:
			types = form.getChecked('arvtype');
			if (!types.length && comment === '') {
				alert('Je moet een reden aanvinken of opgeven');
				return;
			}

			types = types.map(function(v) {
				switch (v) {
					case 'final':
						return 'herhaald vandalisme';
					case 'postblock':
						return 'doorgaand vandalisme na recente blokkade';
					case 'og':
						return 'ongewenste gebruikersnaam';
					case 'crosswiki':
						return 'crosswiki vandaal';
					case 'spambot':
						return 'spambot';
					default:
						return 'geen reden opgegeven';
				}
			}).join('; ');



			if (types) {
				reason += ' ' + types;
			}
			if (comment !== '') {
				reason += (reason === '' ? '' : '. ') + comment;
			}
			reason = reason.trim();
			if (!/[.?!;]$/.test(reason)) {
				reason += ' - ';
			}
			reason += ' ~~~~';
			reason = reason.replace(/\r?\n/g, '\n*:');  // indent newlines

			Morebits.simpleWindow.setButtonsEnabled(false);
			Morebits.status.init(form);

			Morebits.wiki.actionCompleted.redirect = 'Wikipedia:Verzoekpagina voor moderatoren/RegBlok';
			Morebits.wiki.actionCompleted.notice = 'Rapporteren voltooid';

			aivPage = new Morebits.wiki.page('Wikipedia:Verzoekpagina voor moderatoren/RegBlok', 'Regblok verzoek verwerken');
			aivPage.setPageSection(2); // Geteld vanaf boven
			aivPage.setFollowRedirect(true);

			aivPage.load(function() {
				aivPage.getPageText();
				aivPage.getStatusElement().status('Gebruiker rapporteren...');
				aivPage.setEditSummary('Blokverzoek voor [[Overleg gebruiker:' + uid + ']].');
				aivPage.setChangeTags(Twinkle.changeTags);
				aivPage.setAppendText('\n=== ' + uid + ' ===\n*{{lg|' + uid + '}} &ndash; ' + reason);
				aivPage.append();

			});
			break;

		// WP:IPBLOK
		case 'ipblok':
			types = form.getChecked('arvtype');
			if (!types.length && comment === '') {
				alert('Je moet een reden aanvinken of opgeven');
				return;
			}

			types = types.map(function(v) {
				switch (v) {
					case 'final':
						return 'herhaald vandalisme';
					case 'postblock':
						return 'doorgaand vandalisme na recente blokkade';
					case 'crosswiki':
						return 'crosswiki vandaal';
					case 'spambot':
						return 'spambot';
					default:
						return 'geen reden opgegeven';
				}
			}).join('; ');



			if (types) {
				reason += ' ' + types;
			}
			if (comment !== '') {
				reason += (reason === '' ? '' : '. ') + comment;
			}
			reason = reason.trim();
			if (!/[.?!;]$/.test(reason)) {
				reason += ' - ';
			}
			reason += ' ~~~~';
			reason = reason.replace(/\r?\n/g, '\n*:');  // indent newlines

			Morebits.simpleWindow.setButtonsEnabled(false);
			Morebits.status.init(form);

			Morebits.wiki.actionCompleted.redirect = 'Wikipedia:Verzoekpagina voor moderatoren/IPBlok';
			Morebits.wiki.actionCompleted.notice = 'Rapporteren voltooid';

			aivPage = new Morebits.wiki.page('Wikipedia:Verzoekpagina voor moderatoren/IPBlok', 'IPBlok verzoek verwerken');
			aivPage.setPageSection(2); // Geteld vanaf boven
			aivPage.setFollowRedirect(true);

			aivPage.load(function() {
				aivPage.getPageText();
				aivPage.getStatusElement().status('Gebruiker rapporteren...');
				aivPage.setEditSummary('Blokverzoek voor [[Overleg gebruiker:' + uid + ']].');
				aivPage.setChangeTags(Twinkle.changeTags);
				aivPage.setAppendText('\n*{{lg|' + uid + '}} &ndash; ' + reason);
				aivPage.append();

			});
			break;


		// WP:SOKPOP
		case 'sokpop':
			var sockParameters = {
				evidence: form.evidence.value.trim()
			};

			var puppetReport = false; // TODO deze bodge wegwerken

			sockParameters.uid = uid;
			sockParameters.sockpuppets = puppetReport ? [uid] : Morebits.array.uniq($.map($('input:text[name=sockpuppet]', form), function(o) {
				return $(o).val() || null;
			}));

			Morebits.simpleWindow.setButtonsEnabled(false);
			Morebits.status.init(form);
			Twinkle.arv.processSock(sockParameters);
			break;


	}
};

Twinkle.arv.processSock = function(params) {
	Morebits.wiki.addCheckpoint(); // prevent notification events from causing an erronous "action completed"

	// prepare the SPI report
	var verzoek = '\n\n{{subst:Aanvraagcheckuser\n|Hoofdaccount=' + params.uid;
	for (var i = 0; i < params.sockpuppets.length; ++i) {
		verzoek += '\n|Sokpop' + (i + 1) + '=' + params.sockpuppets[i];
	}
	verzoek += '\n|Motivering=' + params.evidence + ' &ndash; ';
	verzoek += '\n}}';

	Morebits.wiki.actionCompleted.redirect = 'Wikipedia:Verzoekpagina voor moderatoren/Sokpoppen';
	Morebits.wiki.actionCompleted.notice = 'Rapporteren succesvol';

	var spiPage = new Morebits.wiki.page('Wikipedia:Verzoekpagina voor moderatoren/Sokpoppen', 'Verzoekpagina ophalen');
	spiPage.setPageSection(1); // Geteld vanaf boven
	spiPage.setFollowRedirect(true);

	spiPage.load(function() {
		spiPage.getPageText();
		spiPage.getStatusElement().status('Gebruiker rapporteren...');
		spiPage.setEditSummary('Checkuserverzoek voor [[Overleg gebruiker:' + params.uid + ']].');
		spiPage.setChangeTags(Twinkle.changeTags);
		spiPage.setAppendText(verzoek);
		spiPage.setWatchlist(Twinkle.getPref('spiWatchReport'));
		spiPage.append();
	});

	Morebits.wiki.removeCheckpoint();  // all page updates have been started
};

Twinkle.addInitCallback(Twinkle.arv, 'arv');
})(jQuery);


// </nowiki>

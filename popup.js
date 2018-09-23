// allow synchronous access to background.js
Background = chrome.extension.getBackgroundPage();

// when popup loads
window.onload = function()
{
	Background.CheckPermissions(
		function(result)
		{
			if (result === true)
				StartPopup();
			else
				window.location.href = 'permissions.html';
		}
	);
}

// start popup
function StartPopup()
{
	// global vars
	UpdatePopupTimer = null;
	ListWarningTimer = null;

	MakeExternalLinks();
	AddListeners();
	GetSettings();
}

// open external links in new tab. without this, extension will try to load links within the popup, causing an error
function MakeExternalLinks()
{
	var links = document.querySelectorAll('.external_link');
	for(var link of links)
		link.onclick = function() { chrome.tabs.create( { url: this.href } ) };
}

// show black list tab
function ShowBlackList()
{
	document.getElementById('black_list_textarea').style.display = 'block';
	document.getElementById('white_list_textarea').style.display = 'none';
	document.getElementById('black_list_tab_button').className = 'tab_button tab_button_active';
	document.getElementById('white_list_tab_button').className = 'tab_button tab_button_inactive';
}

// show white list tab
function ShowWhiteList()
{
	document.getElementById('black_list_textarea').style.display = 'none';
	document.getElementById('white_list_textarea').style.display = 'block';
	document.getElementById('black_list_tab_button').className = 'tab_button tab_button_inactive';
	document.getElementById('white_list_tab_button').className = 'tab_button tab_button_active';
}

// show 'use black list' label
function ShowUseBlackListLabel()
{
	document.getElementById('use_black_list_label').style.display = 'inline';
	document.getElementById('use_white_list_label').style.display = 'none';
}

// show 'use white list' label
function ShowUseWhiteListLabel()
{
	document.getElementById('use_black_list_label').style.display = 'none';
	document.getElementById('use_white_list_label').style.display = 'inline';
}

// attach onclick and onchange events to gui
function AddListeners()
{
	// make add/remove buttons add/remove urls to/from list
	document.getElementById('add_domain_button').onclick 		= function() { Background.AddEntry(true); };
	document.getElementById('remove_domain_button').onclick 	= function() { Background.RemoveEntry(true); };
	document.getElementById('add_page_button').onclick 			= function() { Background.AddEntry(false); };
	document.getElementById('remove_page_button').onclick 		= function() { Background.RemoveEntry(false); };

	// make tab buttons switch tabs (and save settings)
	document.getElementById('black_list_tab_button').onclick 	= function() { ShowBlackList(); SetSettings(); Background.SaveSettings(); };
	document.getElementById('white_list_tab_button').onclick 	= function() { ShowWhiteList(); SetSettings(); Background.SaveSettings(); };

	// save settings on change of any inputs (textbox, radio button, checkbox)
	document.getElementById('mute_all_check').onchange 			= function() { SetSettings(); Background.UncheckMuteUnmuteAllConflict(true); GetSettings(); Background.UpdateAllMutes(); Background.SaveSettings(); }
	document.getElementById('unmute_all_check').onchange 		= function() { SetSettings(); Background.UncheckMuteUnmuteAllConflict(false); GetSettings(); Background.UpdateAllMutes(); Background.SaveSettings(); }
	document.getElementById('unmute_current_check').onchange 	= function() { SetSettings(); Background.UpdateAllMutes(); Background.SaveSettings(); }
	document.getElementById('mute_others_check').onchange 		= function() { SetSettings(); Background.UpdateAllMutes(); Background.SaveSettings(); }
	document.getElementById('use_black_list_check').onchange 	= function() { SetSettings(); GetSettings(); Background.UpdateAllMutes(); Background.SaveSettings(); }
	document.getElementById('black_list_textarea').oninput 		= function() { SetSettings(); Background.LimitList(true); GetSettings(); Background.UpdateArrayLists(); Background.UpdateAllMutes(); Background.SaveSettings(); }
	document.getElementById('white_list_textarea').oninput 		= function() { SetSettings(); Background.LimitList(false); GetSettings(); Background.UpdateArrayLists(); Background.UpdateAllMutes(); Background.SaveSettings(); }
}

// "tab mutes updated" message
function ShowUpdateMessage()
{
	document.getElementById('update_message').style.WebkitTransition = 'opacity 0.1s';
	document.getElementById('update_message').style.opacity = '1.0';
	window.clearTimeout(UpdatePopupTimer);
	UpdatePopupTimer = window.setTimeout(
		function()
		{
			document.getElementById('update_message').style.WebkitTransition = 'opacity 0.5s';
			document.getElementById('update_message').style.opacity = '0.0';
		},
		1000
	);
}

// makes textarea borders red when input too long
function ShowListWarning()
{
	document.getElementById('black_list_textarea').style.WebkitTransition = 'border 0.1s';
	document.getElementById('black_list_textarea').style.border = 'solid 5px rgb(128, 52, 60)';
	document.getElementById('white_list_textarea').style.WebkitTransition = 'border 0.1s';
	document.getElementById('white_list_textarea').style.border = 'solid 5px rgb(128, 52, 60)';
	window.clearTimeout(ListWarningTimer);
	ListWarningTimer = window.setTimeout(
		function()
		{
			document.getElementById('black_list_textarea').style.WebkitTransition = 'border 0.5s';
			document.getElementById('black_list_textarea').style.border = 'solid 5px rgb(80, 168, 218)';
			document.getElementById('white_list_textarea').style.WebkitTransition = 'border 0.5s';
			document.getElementById('white_list_textarea').style.border = 'solid 5px rgb(80, 168, 218)';
		},
		1000
	);
}

// scroll down to the end of the list box
function ScrollListBox()
{
	var listbox = Background.ShowBlackList ? document.getElementById('black_list_textarea') : document.getElementById('white_list_textarea');
	listbox.scrollTop = listbox.scrollHeight;
}

// load settings from background.js
function GetSettings()
{
	// set popup elements from loaded settings
	document.getElementById('mute_all_check').checked = Background.MuteAll;
	document.getElementById('unmute_all_check').checked = Background.UnmuteAll;
	document.getElementById('unmute_current_check').checked = Background.UnmuteCurrent; 
	document.getElementById('mute_others_check').checked = Background.MuteOthers; 
	document.getElementById('use_black_list_check').checked = !Background.UseBlackList;
	Background.UseBlackList ? ShowUseBlackListLabel() : ShowUseWhiteListLabel();
	Background.ShowBlackList ? ShowBlackList() : ShowWhiteList();
	document.getElementById('black_list_textarea').value = Background.BlackList;
	document.getElementById('white_list_textarea').value = Background.WhiteList;
}

// save settings in background.js
function SetSettings()
{
	Background.MuteAll = document.getElementById('mute_all_check').checked;
	Background.UnmuteAll = document.getElementById('unmute_all_check').checked;
	Background.UnmuteCurrent = document.getElementById('unmute_current_check').checked;
	Background.MuteOthers = document.getElementById('mute_others_check').checked;
	Background.UseBlackList = !document.getElementById('use_black_list_check').checked;
	Background.ShowBlackList = document.getElementById('black_list_tab_button').className === 'tab_button tab_button_active';
	Background.BlackList = document.getElementById('black_list_textarea').value;
	Background.WhiteList = document.getElementById('white_list_textarea').value;
}

// add entry to shown list using execCommand (synonymous with the user pasting in text), which allows browser undo/redo
function AddEntry(entry)
{
	var listbox = Background.ShowBlackList ? document.getElementById('black_list_textarea') : document.getElementById('white_list_textarea');
	listbox.focus();
	listbox.selectionStart = listbox.value.length;
	listbox.selectionEnd = listbox.value.length; 
	document.execCommand('insertText', false, '\n'+entry);
	ScrollListBox();
}

// remove entry from shown list using execCommand (synonymous with the user selecting and deleting text), which allows browser undo/redo
function RemoveEntry(entry)
{
	var listbox = Background.ShowBlackList ? document.getElementById('black_list_textarea') : document.getElementById('white_list_textarea');
	listbox.focus();

	var found = false;
	var match;
	while(match = Background.FindEntry(listbox.value, entry), match !== undefined)
	{
		listbox.selectionStart = match.startIndex;
		listbox.selectionEnd = match.endIndex;
		document.execCommand('delete');
		found = true;
	}

	if (found === false)
		ShowListWarning();
}

// handle messages from background.js
function ReceiveBackgroundMessage(message)
{
	if (message.getSettings !== undefined)
		GetSettings();
	if (message.showUpdateMessage !== undefined)
		ShowUpdateMessage();
	if (message.focusElement !== undefined)
		document.getElementById(message.focusElement).focus();
	if (message.scrollListBox !== undefined)
		ScrollListBox();
	if (message.showListWarning !== undefined)
		ShowListWarning();

	if (message.addEntry !== undefined)
		AddEntry(message.addEntry);
	if (message.removeEntry !== undefined)
		RemoveEntry(message.removeEntry);
}
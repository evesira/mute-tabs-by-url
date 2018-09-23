Debug = localStorage.Debug;

// when starting the extension, check if the needed permissions are approved
CheckPermissions(
	function(result)
	{
		if (result === true)
			StartExtension();
	}
);

// checks if the "tabs", "notifications", and "storage" permissions are approved by the user
function CheckPermissions(callback)
{
	chrome.permissions.contains( { permissions: ['tabs', 'notifications', 'storage', 'contextMenus'] } , callback);
}

// request permissions from user
function RequestPermissions(callback)
{
	chrome.permissions.request( { permissions: ['tabs', 'notifications', 'storage', 'contextMenus'] } , callback);
}

// start extension
function StartExtension()
{
	if (Debug)
		console.log('%cstart extension', 'font-weight: bold');

	// default values
	MuteAll = false;
	UnmuteAll = false;
	UnmuteCurrent = false;
	MuteOthers = false;
	UseBlackList = true;
	ShowBlackList = true;
	BlackListArray = [
		['website.com'],
		['example.org'],
		['online.gov']
	];
	WhiteListArray = [
		['google.com'],
		['youtube.com'],
		['netflix.com'],
		['hulu.com'],
		['twitch.tv'],
		['vimeo.com'],
		['soundcloud.com'],
		['pandora.com'],
		['spotify.com'],
		['iheart.com'],
		['shazam.com'],
		['bandcamp.com'],
		['discordapp.com'],
		['twitter.com'],
		['facebook.com'],
		['messenger.com'],
		['dropbox.com'],
		['linkedin.com'],
		['reddit.com'],
		['imgur.com'],
		['instagram.com'],
		['tumblr.com'],
		['pintrest.com'],
		['myspace.com'],
		['vk.com'],
		['blogspot.com'],
		['microsoft.com'],
		['office.com'],
		['outlook.live.com'],
		['apple.com'],
		['yahoo.com'],
		['msn.com'],
		['bing.com'],
		['ask.com'],
		['cnn.com'],
		['nytimes.com'],
		['weather.com'],
		['aol.com'],
		['imdb.com'],
		['espn.com'],
		['amazon.com'],
		['walmart.com'],
		['craigslist.org'],
		['wikipedia.org'],
		['wikia.com'],
		['github.com'],
		['salesforce.com'],
		['yandex.ru'],
		['.mp3'],
		['.mp4'],
		['chrome://'],
		['file://']
	];
	BlackList = BlackListArray.join('\n');
	WhiteList = WhiteListArray.join('\n');

	CurrentTabId = undefined; // keep track of the currently focused tab
	PreviousTabId = undefined; // keep track of the previously focused tab

	// build tab store to allow attaching properties to each tab
	TabStore = {};

	// setTimeout() timer objects
	StoreSettingsTimer = null;
	NotificationTimer = null;

	// initialization
	LoadSettings();
	AddListeners();
	CreateMenuItem();
	BuildTabStore();
	OnTabSwitched();
}

// attach actions to tab changes and keyboard shortcuts
function AddListeners()
{
	chrome.tabs.onCreated.addListener(OnTabCreated);
	chrome.tabs.onReplaced.addListener(OnTabReplaced);
	chrome.tabs.onRemoved.addListener(OnTabRemoved);
	chrome.tabs.onUpdated.addListener(OnTabUpdated);
	chrome.tabs.onActivated.addListener(OnTabSwitched);
	chrome.windows.onFocusChanged.addListener(OnTabSwitched);
	chrome.commands.onCommand.addListener(HandleKeyboardShortcuts);
}

// add menu item to page right click for tab manual un/mute
function CreateMenuItem()
{
	chrome.contextMenus.create( { id: 'menuItem', title: 'Mute Tabs By Url', onclick: ManualOverride } );
}

// update the text of the right click menu item
function UpdateContext(muted, overrideExists)
{
	if (Debug)
	{
		console.group('update context');
		console.log('current muted: ', muted);
		console.log('current overriden: ', overrideExists);
		console.groupEnd();
	}

	chrome.browserAction.setIcon( { path: {'32': muted ? 'icon512muted.png' : 'icon512unmuted.png'} } );
	var text = (muted ? 'Unmute tab' : 'Mute tab') + (overrideExists ? ' *' : '' );
	chrome.contextMenus.update( 'menuItem', { title: text } );
}

// load settings from chrome.storage.sync if they exist. otherwise, default values stay
function LoadSettings()
{
	chrome.storage.sync.get(
		[	
			'MuteAll',
			'UnmuteAll',
			'UnmuteCurrent',
			'MuteOthers',
			'UseBlackList',
			'ShowBlackList',
			'BlackList',
			'WhiteList'
		],
		function(keys)
		{
			if (keys.MuteAll !== undefined)
				MuteAll = keys.MuteAll;
			if (keys.UnmuteAll !== undefined)
				UnmuteAll = keys.UnmuteAll;
			if (keys.UnmuteCurrent !== undefined)
				UnmuteCurrent = keys.UnmuteCurrent;
			if (keys.MuteOthers !== undefined)
				MuteOthers = keys.MuteOthers;
			if (keys.UseBlackList !== undefined)
				UseBlackList = keys.UseBlackList;
			if (keys.ShowBlackList !== undefined)
				ShowBlackList = keys.ShowBlackList;
			if (keys.BlackList !== undefined)
				BlackList = keys.BlackList;
			if (keys.WhiteList !== undefined)
				WhiteList = keys.WhiteList;

			if (Debug)
				console.log('%csettings loaded', 'font-weight: bold');

			UpdateArrayLists();
			UpdateAllMutes();
			StoreSettings();
		}
	);
}

// save settings to storage
function StoreSettings()
{
	chrome.storage.sync.set(
		{
			MuteAll: MuteAll,
			UnmuteAll: UnmuteAll,
			UnmuteCurrent: UnmuteCurrent,
			MuteOthers: MuteOthers,
			UseBlackList: UseBlackList,
			ShowBlackList: ShowBlackList,
			BlackList: BlackList,
			WhiteList: WhiteList
		},
		function()
		{
			if (Debug)
				console.log('%csettings saved', 'font-weight: bold');
		}
	);
}

// save settings to storage with timeout to make sure settings aren't stored too fast as to exceed the sync storage write limits of Chrome
function SaveSettings()
{
	window.clearTimeout(StoreSettingsTimer);
	StoreSettingsTimer = window.setTimeout(StoreSettings, Math.ceil((60*1000)/chrome.storage.sync.MAX_WRITE_OPERATIONS_PER_MINUTE)+10);
}

// splits a string list into an array list (by newline and sub arrays by spaces)
function SplitList(list)
{
	list = list.toLowerCase();
	list = list.split('\n');

	var newList = [];

	for(var entry of list)
	{
		entry = entry.split(new RegExp('\\s'));

		var newEntry = [];

		for(var keyword of entry)
			if (keyword !== '' && keyword !== '-')
				newEntry.push(keyword);

		if (newEntry.length > 0)
			newList.push(newEntry);
	}

	return newList;
}

// split both lists
function UpdateArrayLists()
{
	BlackListArray = SplitList(BlackList);
	WhiteListArray = SplitList(WhiteList);
}

// update all tab mutes
function UpdateAllMutes()
{
	chrome.tabs.query(
		{},
		function(tabList)
		{
			for(var tab of tabList)
				UpdateMute(tab);

			if (Debug)
				console.log('%call tab mutes updated', 'font-weight: bold');
			
			SendPopupMessage( { showUpdateMessage: true } );
		}
	);
}

// the main logic. decide whether or not to mute a tab, then do it
function UpdateMute(tab)
{
	if (tab === undefined)
		return;

	var muteOrNot = false;

	var isCurrent = (tab.id === CurrentTabId);

	var overrideExists, overrideValue;
	if (TabStore[tab.id] !== undefined && TabStore[tab.id].overrideExists === true)
	{
		overrideExists = true;
		overrideValue = TabStore[tab.id].overrideValue;
	}

	if (MuteAll === true)
		muteOrNot = true;
	else if (UnmuteAll === true)
		muteOrNot = false;
	else if (overrideExists === true)
		muteOrNot = overrideValue;
	else if ((UnmuteCurrent === true || MuteOthers === true) && (UnmuteCurrent === isCurrent || MuteOthers === !isCurrent))
		muteOrNot = !isCurrent;
	else
	{
		var listToCheck = UseBlackList ? BlackListArray : WhiteListArray;
		var isOnList = IsOnList(tab.url, listToCheck);
		muteOrNot = UseBlackList ? isOnList : !isOnList;
	}

	chrome.tabs.update(tab.id, { muted: muteOrNot } );

	if (isCurrent)
		UpdateContext(muteOrNot, overrideExists);
}

// check to see if a url contains any entries on a list
function IsOnList(url, list)
{
	//clean url input
	if (typeof url !== 'string' || url === '')
		return false;

	url = url.toLowerCase();

	for(var entry of list) // for every entry in the list
	{
		var meetsKeywords = true;

		for(var keyword of entry) // check if url meets all keyword criteria in the entry
		{
			var wantOrNot = (keyword.charAt(0) !== '-'); // whether or not we want to see the keyword in the url. preceding dash signifies do not want
			if (wantOrNot === false)
				keyword = keyword.substring(1); // remove the dash from the keyword string

			if (url.includes(keyword) !== wantOrNot) // if the url doesn't contain the keyword when we want to see it, or if the url does contain the keyword when we don't want to see it, fail the test
				meetsKeywords = false;
		}
		
		if (meetsKeywords === true) // if url has all keywords in entry, url is on the list
			return true;
	}

	// if no matches found, url is not on the list
	return false;
}

// when the extension starts, add any already open tabs to store
function BuildTabStore()
{
	chrome.tabs.query(
		{},
		function(tabList)
		{
			for(var tab of tabList)
				OnTabCreated(tab);
		}
	);
}

// when a tab is created, add it to the store
function OnTabCreated(tab)
{
	if (Debug)
	{
		console.group('tab created');
		console.log('url: ', tab.url);
		console.log('id: ', tab.id, (tab.active) ? 'active' : '');
		console.log('mute: ', tab.mutedInfo.muted, tab.mutedInfo.reason);
		console.log(tab);
		console.groupEnd();
	}

	TabStore[tab.id] = { overrideExists: false, overrideValue: false };
}

// keep track of tab id changes 
// weird chrome thing. chrome can change the id of a tab under the hood without any other property changing or without any visible signs of change. this occurs sometimes when you open a new blank tab then search google using the address bar.
function OnTabReplaced(addedTabId, removedTabId)
{
	if (Debug)
	{
		console.group('tab replaced');
		console.log('added id: ', addedTabId);
		console.log('removed id: ', addedTabId);
		console.groupEnd();
	}

	if (PreviousTabId === removedTabId)
		PreviousTabId = addedTabId;
	if (CurrentTabId === removedTabId)
		CurrentTabId = addedTabId;

	if (TabStore[removedTabId] !== undefined)
	{
		TabStore[addedTabId] = TabStore[removedTabId];
		delete TabStore[removedTabId];
	}
	else
		TabStore[addedTabId] = { overrideExists: false, overrideValue: false };
}

// when a tab is removed, delete it from the store
function OnTabRemoved(tabId)
{
	if (Debug)
	{
		console.group('tab removed');
		console.log('id: ', tabId);
		console.groupEnd();
	}

	if (PreviousTabId === tabId)
		PreviousTabId = undefined; // if the tab has been closed, set PreviousTabId to undefined to avoid throwing error trying to update tab that no longer exists
	if (CurrentTabId === tabId)
		CurrentTabId = undefined;

	if (TabStore[tabId] !== undefined)
		delete TabStore[tabId];
}

// handle url changes and user manual mute changes
function OnTabUpdated(tabId, changeInfo, tab)
{
	if (Debug)
	{
		console.group('tab updated');
		console.log('url: ', tab.url);
		console.log('id: ', tab.id, (tab.active) ? 'active' : '');
		console.log('mute: ', tab.mutedInfo.muted, tab.mutedInfo.reason);
		console.log('change: ', changeInfo);
		console.log(tab);
		console.groupEnd();
	}

	if (changeInfo.mutedInfo !== undefined && changeInfo.mutedInfo.reason === 'user') // if the user has manually muted or unmuted the tab
		TabStore[tabId] = { overrideExists: true, overrideValue: changeInfo.mutedInfo.muted }; // mark the tab as user overridden

	if (changeInfo.url !== undefined) // if the url of the tab has changed, or a new tab has been created...
		UpdateMute(tab); // update the mute of the new or changed tab
}

// when the user switches tabs...
function OnTabSwitched()
{
	GetCurrentTab(
		function(currentTab)
		{
			PreviousTabId = CurrentTabId;
			CurrentTabId = currentTab.id;

			if (Debug)
			{
				console.group('tab switched');
				console.log('current id: ', CurrentTabId);
				console.log('previous id: ', PreviousTabId);
				console.log(currentTab);
				console.groupEnd();
			}

			// update the mutes of the switched to tab and the previous tab
			if (PreviousTabId !== undefined)
				chrome.tabs.get(PreviousTabId, function(tab) { UpdateMute(tab); } );
			if (CurrentTabId !== undefined)
				chrome.tabs.get(CurrentTabId, function(tab) { UpdateMute(tab); } );
		}
	);
}

// uncheck mute_all or unmmute_all if both are checked
function UncheckMuteUnmuteAllConflict(muteAllChanged)
{
	if (MuteAll === true && UnmuteAll === true)
	{
		if (muteAllChanged === true)
			UnmuteAll = false;
		else
			MuteAll = false;
	}
}

// limit both lists
function LimitList(limitBlackList)
{
	var limit = LimitText(limitBlackList ? BlackList : WhiteList);
	limitBlackList ? BlackList = limit.text : WhiteList = limit.text;

	if (limit.limited === true)
		SendPopupMessage( { showListWarning: true } );
}

// limit text in list boxes to stay under the Chrome sync storage limit
function LimitText(text)
{
	var sizeLimit = chrome.storage.sync.QUOTA_BYTES_PER_ITEM-16;
	var limited = false;
	var size;
	while(size = GetStringByteSize(text), size > sizeLimit)
	{
		limited = true;
		var removeCount = Math.ceil((size-sizeLimit)/4); // assume all bytes above byte limit are of characters that are 4 bytes long (worst case per UTF-8), and remove that many characters
		text = text.slice(0, text.length-removeCount);
	}

	return { text: text, limited: limited };
}

// get size in bytes of JSON stringified string
function GetStringByteSize(str)
{
	return (new TextEncoder('utf-8')).encode(JSON.stringify(str)).length;
}

// add url to shown list
function AddEntry(justDomain)
{
	GetCurrentTab(
		function(currentTab)
		{
			var entry = GetUrl(currentTab.url, justDomain);
			if (entry === undefined)
				return;

			if (GetPopup() !== undefined)
				SendPopupMessage( { addEntry: entry } );
			else
			{
				var newList = (ShowBlackList ? BlackList : WhiteList)+'\n'+entry;

				if (LimitText(newList).limited === false)
				{
					ShowBlackList ? BlackList = newList : WhiteList = newList;				
					UpdateArrayLists();
					UpdateAllMutes();
					SaveSettings();
					Notification('Added to ' + (ShowBlackList ? 'black list' : 'white list'), entry);
				}
				else
					Notification('Can\'t add to ' + (ShowBlackList ? 'black list' : 'white list'), entry);
			}
		}
	);
}

// remove url from shown list
function RemoveEntry(justDomain)
{
	GetCurrentTab(
		function(currentTab)
		{
			var entry = GetUrl(currentTab.url, justDomain);
			if (entry === undefined)
				return;

			if (GetPopup() !== undefined)
				SendPopupMessage( { removeEntry: entry } )
			else
			{
				var found = false;
				var list = (ShowBlackList ? BlackList : WhiteList);
				var match;
				while(match = FindEntry(list, entry), match !== undefined)
				{
					list = list.substring(0, match.startIndex) + list.substring(match.endIndex);
					found = true;
				}

				ShowBlackList ? BlackList = list : WhiteList = list;				
				UpdateArrayLists();
				UpdateAllMutes(); 
				SaveSettings();

				if (found === true)
					Notification('Removed from ' + (ShowBlackList ? 'black list' : 'white list'), entry);
				else
					Notification('Not found on ' + (ShowBlackList ? 'black list' : 'white list'), entry);
			}
		}
	);
}

// find start and end indexes of entry on list
function FindEntry(list, entry)
{
	if (entry.length === 0)
		return;

	entry = entry.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'); // escape regex special characters
	var expression = new RegExp('^\\s*' + entry + '\\s*$', 'm');
	var match = list.match(expression);

	if (match !== null)
	{
		var startIndex = match.index;
		var endIndex = startIndex+match[0].length;
		if (list.charAt(endIndex) === '\n')
			endIndex++;

		return { startIndex: startIndex, endIndex: endIndex };
	}
}

// toggle the manual override un/mute of the current tab
function ManualOverride()
{
	GetCurrentTab(
		function(currentTab)
		{
			var newMute = !currentTab.mutedInfo.muted;
			TabStore[currentTab.id] = { overrideExists: true, overrideValue: newMute };
			Notification('Tab ' + (newMute ? 'muted' : 'unmuted'), currentTab.url, true);
			UpdateMute(currentTab);
		}
	);
}

// get currently in-focus tab
function GetCurrentTab(callback)
{
	chrome.tabs.query(
		{
			active: true,
			lastFocusedWindow: true
		},
		function(tabList)
		{
			if (tabList[0] !== undefined) // if switching to the developer console, tabs.query will return no results, as the console tab can't be accessed/modified
				callback(tabList[0]);
		}
	);
}

// return url or domain of url
function GetUrl(url, justDomain)
{
	//clean url input
	if (typeof url !== 'string' || url === '')
		return;

	if (justDomain === true)
	{
		url = (new URL(url)).hostname;
		if (url.substring(0,4) === 'www.')
			url = url.substring(4);
	}

	return url;
}

// if the popup window is open, return the window object for it to allow access to popup.js functions/variables/DOM
function GetPopup()
{
	var view = chrome.extension.getViews( { type: 'popup' } );
	if (view.length === 1 && view[0].document.title === 'Popup')
		return view[0];
}

// show notification
function Notification(title, message, force)
{
	if (GetPopup() === undefined || force === true)
	{
		chrome.notifications.create('notification', { type: 'basic', iconUrl: 'icon512.png', title: title, message: message, priority: 2} );
		window.clearTimeout(NotificationTimer);
		NotificationTimer = window.setTimeout(function() { chrome.notifications.clear('notification'); }, 3000);
	}
}

// handle keyboard shortcuts
function HandleKeyboardShortcuts(command)
{
	if (Debug)
	{
		console.group('keyboard shortcut pressed');
		console.log('command: ', command);
		console.groupEnd();
	}
	
	switch(command)
	{
		case '01-mute-all':
		MuteAll = !MuteAll;
		UncheckMuteUnmuteAllConflict(true);
		UpdateAllMutes();
		SaveSettings();
		Notification('Mute All Tabs', MuteAll ? 'On' : 'Off');
		SendPopupMessage( { focusElement: 'mute_all_check', getSettings: true } );
		break;

		case '02-unmute-all':
		UnmuteAll = !UnmuteAll;
		UncheckMuteUnmuteAllConflict(false);
		UpdateAllMutes();
		SaveSettings();
		Notification('Unmute All Tabs', UnmuteAll ? 'On' : 'Off');
		SendPopupMessage( { focusElement: 'unmute_all_check', getSettings: true } );
		break;

		case '03-unmute-current':
		UnmuteCurrent = !UnmuteCurrent;
		UpdateAllMutes();
		SaveSettings();
		Notification('Always unmute current tab', UnmuteCurrent ? 'On' : 'Off');
		SendPopupMessage( { focusElement: 'unmute_current_check', getSettings: true } );
		break;

		case '04-mute-others':
		MuteOthers = !MuteOthers;
		UpdateAllMutes();
		SaveSettings();
		Notification('Always mute all other tabs', MuteOthers ? 'On' : 'Off');
		SendPopupMessage( { focusElement: 'mute_others_check', getSettings: true } );
		break;

		case '05-use-black-list':
		UseBlackList = !UseBlackList;
		UpdateAllMutes();
		SaveSettings();
		Notification('Use', UseBlackList ? 'Black list' : 'White list');
		SendPopupMessage( { focusElement: 'use_black_list_check', getSettings: true } );
		break;

		case '06-shown-list':
		ShowBlackList = !ShowBlackList;
		SaveSettings();
		Notification('Show', ShowBlackList ? 'Black list' : 'White list');
		SendPopupMessage( { focusElement: (ShowBlackList ? 'black_list_tab_button' : 'white_list_tab_button'), getSettings: true } );
		break;

		case '07-add-domain':
		AddEntry(true);
		SendPopupMessage( { focusElement: 'add_domain_button' } );
		break;

		case '08-remove-domain':
		RemoveEntry(true);
		SendPopupMessage( { focusElement: 'remove_domain_button' } );
		break;

		case '09-add-page':
		AddEntry(false);
		SendPopupMessage( { focusElement: 'add_page_button' } );
		break;

		case '10-remove-page':
		RemoveEntry(false);
		SendPopupMessage( { focusElement: 'remove_page_button' } );
		break;

		case '11-manual-override':
		ManualOverride();
		break;
	}
}

// send message synchronously to popup.js
function SendPopupMessage(message)
{
	var popup = GetPopup();
	if (popup !== undefined)
		popup.ReceiveBackgroundMessage(message);
}
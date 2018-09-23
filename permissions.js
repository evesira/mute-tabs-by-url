// allow synchronous access to background.js
Background = chrome.extension.getBackgroundPage();

// when popup loads
window.onload = function()
{
	AddListeners();
}

// attach onclick and onchange events to gui
function AddListeners()
{
	document.getElementById('approve_permissions_button').onclick = ApprovePermissions;
}

// approve "tabs", "notifications", and "storage" permissions
function ApprovePermissions()
{
	Background.RequestPermissions( 
		function(granted)
		{
			if (granted === true)
			{
				window.location.href = 'popup.html';
				Background.StartExtension();
			}
		}
	);
}
// when popup loads
window.onload = function()
{
	MakeExternalLinks();
	MakeHelpAccordion();
}

// open external links in new tab. without this, extension will try to load link within the popup, causing an error
function MakeExternalLinks()
{
	var links = document.querySelectorAll('.external_link');
	for(var link of links)
		link.onclick = function() { chrome.tabs.create( { url: this.href } ) };
}


// make expandable headers
function MakeHelpAccordion()
{
	var headers = document.getElementsByClassName('help_header');
	for(var header of headers)
	{
		header.nextElementSibling.style.display = 'none';
		header.onclick = function()
		{
			if (this.nextElementSibling.style.display === 'none')
			{
				this.nextElementSibling.style.display = 'block';
				this.getElementsByTagName('img')[0].src = 'uparrow.svg';
			}
			else
			{
				this.nextElementSibling.style.display = 'none';
				this.getElementsByTagName('img')[0].src = 'downarrow.svg';
			}
		};
	}
}
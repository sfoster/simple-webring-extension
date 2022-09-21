# simple-webring-extension

Remember [Webrings?](https://en.wikipedia.org/wiki/Webring) They are a fun way of adding a little serendipity to your browsing, and heading down a curated rabbit hole on the web. This is a browser extension to provide some of that experience: toolbar access to collections of URLs on a particular topic.

## How to use

Maybe eventually we'll get this listed on addons.mozilla.org, but while its still early days you'll need to clone the repo and load it as a [temporary extension](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/) using about:debugging.

## Status

Some initial functionality is implemented: 

* There's a panel with the UI to select one of the available webrings, and  navigate through the URL collection each ring represents.
* If the active tab's URL is in that collection, it will give you back/next buttons
* The default registry of webrings comes from `data/rings.json`. Each webring has a `collectionURL` which will be resolved as relative to the registry. 
* The default/initial webring comes from `data/default.json` file. 
* The current webring (but not the registry) is polled periodically for changes.

## Known TODOs

Please file issues in github, but these things at least are known: 

* Extension update handling hasn't been considered as we're not producing a packaged extension yet.
* Smarter URL matching, to allow for redirects, querystrings: We need to match the current tab's URL to entries in the webring to know where we are in that list. Should we match on origin + pathname only? Or include some but not all querystring params (e.g. some wordpress sites have all the same path and pages only differ by the querystring).
* UI improvements: 
  * Add the `who` value from the collection data
  * ~~Replace the placeholder icon~~ I decided I like it

## Ring Content

PRs welcome for the default data files. Please keep it safe-for-work and abide by [Mozilla's code of conduct](https://www.mozilla.org/en-US/about/governance/policies/participation/)


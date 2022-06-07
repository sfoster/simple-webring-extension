# simple-webring-extension

A browser extension to provide access to a collection of URLs on a particular topic. 

## Status

Just prototyping some initial functionality: 

* There's a panel with the UI to navigate through the URL collection
* If the active tab's URL is in that collection, it will give you back/next buttons
* Default/initial data comes from the `data/default.json` file. But there's planned support for a `remoteDataUrl` property in `config.js` which might let us host that elsewhere

## Known TODOs

Please file issues in github, but these things at least are known: 

* Update handling
* Data-freshness handling
* Smarter URL matching, to allow for redirects, querystrings
* UI improvements: 
  * Styling the panel
  * Add the `who` value from the collection data
  * Replace the placeholder icon

## Ring Content

PRs welcome for the default.json. Please keep it safe-for-work and abide by [Mozilla's code of conduct](https://www.mozilla.org/en-US/about/governance/policies/participation/)


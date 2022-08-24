# simple-webring-extension

A browser extension to provide access to a collection of URLs on a particular topic. 

## Status

Just prototyping some initial functionality: 

* There's a panel with the UI to navigate through the URL collection
* If the active tab's URL is in that collection, it will give you back/next buttons
* The default registry of webrings comes from `data/rings.json`. Each webring has a `collectionURL` which will be resolved as relative to the registry. 
* The default/initial collection comes from `data/default.json` file. 
* The collection (but not the registry) is polled periodically for changes.

## Known TODOs

Please file issues in github, but these things at least are known: 

* Update handling
* Smarter URL matching, to allow for redirects, querystrings
* UI improvements: 
  * Add the `who` value from the collection data
  * ~~Replace the placeholder icon~~ I decided I like it

## Ring Content

PRs welcome for the default data files. Please keep it safe-for-work and abide by [Mozilla's code of conduct](https://www.mozilla.org/en-US/about/governance/policies/participation/)


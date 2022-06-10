const MESSAGE_ACTION = "ringAction";
const MESSAGE_DATA_UPDATE = "dataUpdate";
const MESSAGE_READY = "panelReady";

console.log("got window.config:", window.config);

let webRingManager;

function initialize() {
  if (!webRingManager) {
    webRingManager = new WebRingManager(window.config);

    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (tab.active) {
        webRingManager?.onTabUpdated(tab);
      }
    }, {
      properties: ["status", "url"]
    });

    browser.tabs.onActivated.addListener(async (activeInfo) => {
      const tab = await browser.tabs.get(activeInfo.tabId);
      webRingManager?.onTabUpdated(tab);
    });

    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      webRingManager?.onMessage(request, sender, sendResponse);
    });
  }
}

browser.runtime.onStartup.addListener(initialize);
browser.runtime.onInstalled.addListener(initialize);

class WebRingManager {
  currentURL = null
  panelUIReady = false
  isDataReady = false
  currentTabId = null

  constructor(config) {
    this.config = config;
    this.ringURLsMap = new Map();
    console.log("WebRing constructor, got config:", config);

    const dataLoaded = this.loadRingData().then((data) => {
      if (data?.entries) {
        for (let entry of data.entries) {
          this.ringURLsMap.set(entry.url, entry);
        }
      }
    });
    const gotCurrentTab = browser.tabs.query({currentWindow: true, active: true}).then((tabs) => {
      if (tabs[0]) {
        this.currentTabId= tabs[0].id;
      }
    });
    Promise.all([dataLoaded, gotCurrentTab]).then(() => {
      this.isDataReady = true;
      this.onRingDataUpdate();
      this.initialized = Date.now();
    })
  }

  get ringURLs() {
    return Array.from(this.ringURLsMap.keys());
  }
  get currentURLIndex() {
    return this.currentURL ? this.ringURLs.indexOf(this.currentURL) : -1;
  }

  onMessage(request, sender, sendResponse) {
    if (request.action == MESSAGE_ACTION) {
      this.handleActionRequest(request);
    }
    else if (request.action == MESSAGE_READY) {
      this.panelUIReady = true;
      this.onRingDataUpdate();
    }
  }

  onTabUpdated(tab) {
    if (tab && tab.id) {
      this.currentTabId = tab.id;
    } else {
      return;
    }
    let url = this.sanitizeURL(tab.url);
    console.log(`sanitized: ${tab.url} to ${url}`);
    if (url && this.currentURL != url) {
      this.changeCurrentURL(url);
    }
  }
  sanitizeURL(_url) {
    if (_url) {
      try {
        let url = new URL(_url);
        if (url.origin && url.origin != "null") {
          return `${url.origin}${url.pathname}`;
        }
      } catch (ex) {
        console.log("Failed to sanitize url:", _url, ex);
      }
    }
    return _url;
  }
  changeCurrentURL(url) {
    console.log(`changeCurrentURL, was: ${this.currentURL}, to: ${url}`);
    if (url !== "about:blank") {
      this.currentURL = url;
    }
    let iconURL = this.currentURLIndex > -1 ?
        browser.runtime.getURL("assets/rainbow.svg") :
        browser.runtime.getURL("assets/icon.svg");
    browser.browserAction.setIcon({
      path: iconURL
    });
  }
  handleActionRequest(request) {
    let idx = this.currentURLIndex;
    console.log(`Got action request, ${request.data}, currentURLIndex:${idx}`);

    switch (request.data) {
      case "back":
        if (idx == -1) {
          console.log("Can't go back, index is -1");
          return;
        }
        idx = idx > 0 ? --idx : this.ringURLsMap.size - 1;
        this.navigateToRingIndex(idx);
        break;
      case "next":
        if (idx == -1) {
          console.log("Can't go next, index is -1");
          return;
        }
        idx = idx >= this.ringURLsMap.size -1 ? 0 : ++idx;
        this.navigateToRingIndex(idx);
        break;
      case "random":
        idx = Math.floor(Math.random() * this.ringURLsMap.size);
        this.navigateToRingIndex(idx);
        break;
    }
  }
  async navigateToRingIndex(idx) {
    let url = this.ringURLs[idx];
    if (!url) {
      console.log("navigateToRingIndex: no url at index", idx);
      return;
    }

    let tabId = this.currentTabId;
    console.log("navigateToRingIndex, loading url into tab:", url, tabId);
    if (tabId && tabId !== browser.tabs.TAB_ID_NONE) {
      try {
        browser.tabs.update(tabId, {
          highlighted: true,
          url,
        });
      } catch (ex) {
        console.warn("Failed to load ring url:", url, ex);
      }
    }
  }
  async loadRingData() {
    let dataURL = this.config.remoteDataURL;
    let resp, data;
    if (!dataURL) {
      dataURL = browser.runtime.getURL("data/default.json");
    }
    console.log("loadRingData, fetching ", dataURL);
    try {
      resp = await fetch(dataURL);
    } catch (ex) {
      console.warn("Failed to fetch dataURL:", ex);
    }
    if (resp) {
      try {
        data = await resp.json();
      } catch(ex) {
        console.warn("Failed to parse JSON data:", ex);
      }
    }
    console.log("loadRingData, returning ", data);
    return data;
  }
  onRingDataUpdate() {
    if (this.panelUIReady) {
      browser.runtime.sendMessage({
        action: MESSAGE_DATA_UPDATE,
        data: {
          ringURLIndex: this.currentURLIndex,
          ringURLCount: this.ringURLs.length,
        }
      });
    }
  }
}

console.log("WebRing background.js");
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
  currentUrl = null
  panelUIReady = false
  isDataReady = false

  constructor(config) {
    this.config = config;
    this.ringUrlsMap = new Map();
    console.log("WebRing constructor, got config:", config);

    this.loadRingData().then((data) => {
      if (data?.entries) {
        for (let entry of data.entries) {
          this.ringUrlsMap.set(entry.url, entry);
        }
        this.isDataReady = true;
        this.onRingDataUpdate();
      }
    });

    this.currentTabId = browser.tabs.getCurrent();
  }

  get ringUrls() {
    return Array.from(this.ringUrlsMap.keys());
  }
  get currentUrlIndex() {
    return this.currentUrl ? this.ringUrls.indexOf(this.currentUrl) : -1;
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
    let url = this.sanitizeUrl(tab.url);
    console.log(`sanitized: ${tab.url} to ${url}`);
    if (url && this.currentUrl != url) {
      this.changeCurrentUrl(url);
    }
  }
  sanitizeUrl(_url) {
    if (_url) {
      try {
        let url = new URL(_url);
        return `${url.origin}${url.pathname}`;
      } catch (ex) {
        console.log("Failed to sanitize url:", _url, ex);
      }
    }
    return null;
  }
  changeCurrentUrl(url) {
    console.log(`changeCurrentUrl, was: ${this.currentUrl}, to: ${url}`);
    if (url !== "about:blank") {
      this.currentUrl = url;
    }
    let iconUrl = this.currentUrlIndex > -1 ?
        browser.runtime.getURL("assets/rainbow.svg") :
        browser.runtime.getURL("assets/icon.svg");
    browser.browserAction.setIcon({
      path: iconUrl
    });
  }
  handleActionRequest(request) {
    let idx = this.currentUrlIndex;
    console.log(`Got action request, ${request.data}, currentUrlIndex:${idx}`);

    switch (request.data) {
      case "back":
        if (idx == -1) {
          console.log("Can't go back, index is -1");
          return;
        }
        idx = idx > 0 ? --idx : this.ringUrlsMap.size - 1;
        this.navigateToRingIndex(idx);
        break;
      case "next":
        if (idx == -1) {
          console.log("Can't go next, index is -1");
          return;
        }
        idx = idx >= this.ringUrlsMap.size -1 ? 0 : ++idx;
        this.navigateToRingIndex(idx);
        break;
      case "random":
        idx = Math.floor(Math.random() * this.ringUrlsMap.size);
        this.navigateToRingIndex(idx);
        break;
    }
  }
  async navigateToRingIndex(idx) {
    let url = this.ringUrls[idx];
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
    let dataUrl = this.config.remoteDataUrl;
    let resp, data;
    if (!dataUrl) {
      dataUrl = browser.runtime.getURL("data/default.json");
    }
    console.log("loadRingData, fetching ", dataUrl);
    try {
      resp = await fetch(dataUrl);
    } catch (ex) {
      console.warn("Failed to fetch dataUrl:", ex);
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
          ringUrlIndex: this.currentUrlIndex,
          ringUrlCount: this.ringUrls.length,
        }
      });
    }
  }
}

console.log("WebRing background.js");
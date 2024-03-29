const MESSAGE_ACTION = "ringAction";
const MESSAGE_REQUEST = "ringRequest";
const MESSAGE_DATA_UPDATE = "dataUpdate";
const MESSAGE_READY = "panelReady";

let webRingManager;
let ringCollection;
let ringRegistry;
let currentRingConfig;
let isInitialized = false;

async function initialize() {
  console.log("initialize: got window.config:", window.config);

  if (!isInitialized) {
    ringRegistry = window.ringRegistry = new RingRegistry(window.config);
    ringRegistry.on("error", (errorDetails) => {
      console.error("Got error loading registry data:", errorDetails);
    });
    console.log("ringRegistry created");

    webRingManager = window.webRingManager = new WebRingManager({
      ...window.config
    });
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

    await ringRegistry.fetchData();
    isInitialized = true;
  }

  console.log("ringRegistry data fetched, default entries:", ringRegistry.get("default"));

  // TODO: we could store the current selected ring id and retrieve it here
  const ringId = config.selectedRing;
  await webRingManager.setRingCollection(ringId);
}

browser.runtime.onStartup.addListener(initialize);
browser.runtime.onInstalled.addListener(initialize);

class WebRingManager {
  currentURL = null
  panelUIReady = false
  isDataReady = false
  currentTabId = null

  constructor({ ringCollection, ...config }) {
    this.config = config;
    console.log("WebRing constructor, got config:", config);

    this.gotCurrentTab = browser.tabs.query({currentWindow: true, active: true}).then((tabs) => {
      if (tabs[0]) {
        this.currentTabId = tabs[0].id;
      }
    });
  }
  setRingCollection(ringId) {
    let ringConfig = ringRegistry.get(ringId);
    if (!ringConfig) {
      console.warn("No such collection in the current registry: ", ringId);
      return;
    }
    currentRingConfig = ringConfig;
    ringCollection = window.ringCollection = new WatchedURLCollection(currentRingConfig, ringRegistry.dataURL);
    console.log("updated ringCollection:", ringId, ringCollection);

    if (this.ringCollection) {
      this.ringCollection.reset();
    }
    this.ringCollection = ringCollection;
    ringCollection.on("error", this);

    const initialDataLoaded = ringCollection.watchRemoteData(() => {
      // called whenever remote collection changes
      console.log("watchRemoteData callback, calling onRingDataUpdate");
      this.onRingDataUpdate();
    });

    Promise.all([initialDataLoaded, this.gotCurrentTab]).then(() => {
      this.isDataReady = true;
      this.initialized = Date.now();
    }).finally(() => {
      if (this.ringCollection.error) {
        this.updateIcon("error");
      } else {
        console.log("fetchData result:", this.ringCollection);
        this.onRingChanged();
        this.onRingDataUpdate();
      }
    })
  }
  get ringURLs() {
    return Array.from(this.ringCollection.keys());
  }
  get currentURLIndex() {
    return this.currentURL ? this.ringURLs.indexOf(this.currentURL) : -1;
  }

  handleTopic(topic, eventData) {
    switch (topic) {
      case "error":
        console.error("Error:", eventData);
        break;
    }
  }

  onMessage(request, sender, sendResponse) {
    console.log("onMessage:", request.action, request);
    if (request.action == MESSAGE_ACTION) {
      this.handleActionRequest(request);
    }
    else if (request.action == MESSAGE_READY) {
      this.panelUIReady = true;
      this.onRingDataUpdate();
    }
    else if (request.action == MESSAGE_REQUEST) {
      this.setRingCollection(request.data);
    }
  }

  onTabUpdated(tab) {
    if (tab && tab.id) {
      this.currentTabId = tab.id;
    } else {
      return;
    }
    let url = this.sanitizeURL(tab.url);
    // console.log(`sanitized: ${tab.url} to ${url}`);
    this.changeCurrentURL(url);
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
    // console.log(`changeCurrentURL, was: ${this.currentURL}, to: ${url}`);
    if (url !== "about:blank") {
      this.currentURL = url;
    }
    this.updateIcon(this.currentURLIndex > -1 ? "in-ring" : "default")
  }
  updateIcon(state) {
    let iconURL;
    switch (state) {
      case "in-ring":
        iconURL = browser.runtime.getURL("assets/rainbow.svg");
        break;
      case "error":
        iconURL = browser.runtime.getURL("assets/error.svg");
        break;
      default:
        iconURL = browser.runtime.getURL("assets/icon.svg");
    }
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
        idx = idx > 0 ? --idx : this.ringCollection.size - 1;
        this.navigateToRingIndex(idx);
        break;
      case "next":
        if (idx == -1) {
          console.log("Can't go next, index is -1");
          return;
        }
        idx = idx >= this.ringCollection.size -1 ? 0 : ++idx;
        this.navigateToRingIndex(idx);
        break;
      case "random":
        idx = Math.floor(Math.random() * this.ringCollection.size);
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
  onRingChanged() {
    console.log("ring changed, update:", this.currentURLIndex, this.currentURLIndex > -1 ? "in-ring" : "default");

    browser.tabs.get(this.currentTabId).then(currentTab => {
      console.log("ring changed, current tab:", currentTab.url);
      this.onTabUpdated(currentTab);
    }).catch(ex => {
      console.log("ring changed, failed to get current tab:", ex);
    });
  }
  onRingDataUpdate() {
    // notify the panel if it has been opened already and has stale data
    console.log("onRingDataUpdate, ringURLs:", this.ringURLs);
    if (this.panelUIReady) {
      browser.runtime.sendMessage({
        action: MESSAGE_DATA_UPDATE,
        data: {
          entriesList: Array.from(this.ringCollection.values()),
          ringsById: Object.fromEntries(ringRegistry),
          ringURLIndex: this.currentURLIndex,
          ringURLCount: this.ringURLs.length,
          currentRingId: currentRingConfig.id,
        }
      });
    }
  }
}


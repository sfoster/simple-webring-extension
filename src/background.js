const MESSAGE_ACTION = "ringAction";
const MESSAGE_DATA_UPDATE = "dataUpdate";
const MESSAGE_READY = "panelReady";

const WebRing = new class _WebRing {
  currentUrl = null
  panelUIReady = false

  constructor() {
    console.log("WebRing constructor");
    this.ringUrlsMap = new Map();

    this.loadRingData().then((data) => {
      for (let entry of data.entries) {
        this.ringUrlsMap.set(entry.url, entry);
      }
      this.onRingDataUpdate();
    });

    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (tab.active) {
        this.onTabUpdated(tab);
      }
    }, {
      properties: ["status", "url"]
    });
    browser.tabs.onActivated.addListener(async (activeInfo) => {
      const tab = await browser.tabs.get(activeInfo.tabId);
      this.onTabUpdated(tab);
    });
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log("onMessage:", request, sender);
      if (request.action == MESSAGE_ACTION) {
        this.handleActionRequest(request);
      }
      else if (request.action == MESSAGE_READY) {
        this.panelUIReady = true;
        this.onRingDataUpdate();
      }
    });
    this.currentTabId = browser.tabs.getCurrent();
  }
  get currentUrlIndex() {
    let urls = Array.from(this.ringUrlsMap.keys());
    return this.currentUrl ? urls.indexOf(this.currentUrl) : -1;
  }
  onTabUpdated(tab) {
    if (tab && tab.url && this.currentUrl != tab.url) {
      this.changeCurrentUrl(tab.url);
    }
  }
  changeCurrentUrl(url) {
    console.log(`changeCurrentUrl, was: ${this.currentUrl}, to: ${url}`);
    if (url !== "about:blank") {
      this.currentUrl = url;
    }
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
          console.log("Can't go back, index is -1");
          return;
        }
        idx = idx >= this.ringUrlsMap.size ? 0 : ++idx;
        this.navigateToRingIndex(idx);
        break;
      case "random":
        idx = Math.floor(Math.random() * this.ringUrlsMap.size);
        this.navigateToRingIndex(idx);
        break;
    }
  }
  navigateToRingIndex(idx) {
    let urls = Array.from(this.ringUrlsMap.keys());
    console.log("TODO: switch tab to url:", urls[idx], idx);
  }
  loadRingData() {
    return Promise.resolve({
      modified: Date.now(),
      entries: [
        {
          url: "https://bugzilla.mozilla.org/",
          who: "Sam",
        },
        {
          url: "https://www.sam-i-am.com/",
          who: "Sam",
        },
        {
          url: "https://searchfox.org/",
          who: "Someone-Else",
        },
      ]
    })
  }
  onRingDataUpdate() {
    if (this.panelUIReady) {
      browser.runtime.sendMessage({
        action: MESSAGE_DATA_UPDATE,
        currentUrl: this.currentUrl,
        data: Object.fromEntries(this.ringUrlsMap),
      });
    }
  }
}

console.log("WebRing background.js");
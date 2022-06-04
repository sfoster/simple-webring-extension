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
  get ringUrls() {
    return Array.from(this.ringUrlsMap.keys());
  }
  get currentUrlIndex() {
    return this.currentUrl ? this.ringUrls.indexOf(this.currentUrl) : -1;
  }
  onTabUpdated(tab) {
    if (tab && tab.id) {
      this.currentTabId = tab.id;
    }
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
        data: {
          ringUrlIndex: this.currentUrlIndex,
          ringUrlCount: this.ringUrls.length,
        }
      });
    }
  }
}

console.log("WebRing background.js");
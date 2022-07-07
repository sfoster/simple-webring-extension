const FALLBACK_COLLECTION_URL = "data/default.json";

class RingCollection extends Map {
  _dataRefreshInterval = 60000;
  _dataURL = null;
  _refreshTimerID = null;
  error = null;

  constructor({
    collectionURL,
    dataRefreshSeconds = 60,
  }) {
    super();
    let url = null;
    console.log(`RingCollection ctor, collectionURL: ${collectionURL}, dataRefreshSeconds: ${dataRefreshSeconds}`);
    this.dataURL = collectionURL || FALLBACK_COLLECTION_URL;
    this._lastFetched = 0;
    this.dataRefreshSeconds = dataRefreshSeconds;
  }
  get dataURL() {
    return this._dataURL.href;
  }
  set dataURL(url) {
    let dataURL;
    if (url instanceof URL) {
      dataURL = url;
    } else {
      try {
        dataURL = new URL(url);
      } catch (ex) {
        // was path only? Resolve as relative to this extension's origin
        try {
          const extensionURL = browser.runtime.getURL(url);
          dataURL = new URL(extensionURL);
        } catch (ex2) {
          console.warn("RingCollection exception creating URL from runtime.getURL() result:", url, ex2);
          this.error = new Error("Bad dataURL");
        }
      }
    }
    if (dataURL) {
      this._dataURL = dataURL;
      if (this._refreshTimerID) {
        // reset and re-trigger the timer
        this.watchRemoteData();
      }
    }
  }
  get dataRefreshSeconds() {
    return this._dataRefreshInterval/1000;
  }
  set dataRefreshSeconds(seconds) {
    this._dataRefreshInterval = seconds * 1000;
    if (this._refreshTimerID) {
      // reset and re-trigger the timer
      this.watchRemoteData();
    }
  }
  watchRemoteData(callback) {
    if (callback) {
      this._onDataChangeCallback = callback;
    }
    this._lastFetched = 0;
    if (this._refreshTimerID) {
      clearInterval(this._refreshTimerID);
    }
    console.log(`Scheduling data refresh after: ${this.dataRefreshSeconds}s`);
    this._refreshTimerID = setInterval(() => {
      this.fetchData();
    }, this._dataRefreshInterval);
    return this.fetchData();
  }
  fetchData() {
    return this._fetchData().then(() => {
      let newSnapshot = this.toJSON();
      if (newSnapshot == this._previousData) {
        console.log("No change to remote ring data");
      } else {
        this._onDataChangeCallback(this);
      }
    });
  }
  _fetchData() {
    this._previousData = this.toJSON(2);
    this.reset();
    const fetchedPromise = fetch(this.dataURL).then(async (resp) => {
      if (resp.ok) {
        try {
          const json = await resp.json();
          this._lastFetched = Date.now();
          this.populate(json);
          return;
        } catch (ex) {
          this.reportError("JSON parse exception", ex);
        }
      } else {
        this.reportError(
          "Failed to fetch dataURL",
          { status: resp.status, statusText: resp.statusText }
        );
        return;
      }
    }).catch(ex => {
      this.reportError("Exception fetching dataURL", ex);
    });
    return fetchedPromise;
  }
  reset() {
    delete this.error;
    this.clear();
    if (this._refreshTimerID) {
      clearInterval(this._refreshTimerID);
    }
  }
  populate(data) {
    this.clear();
    if (data?.entries) {
      for (let entry of data.entries) {
        this.set(entry.url, entry);
      }
    };
  }
  toJSON(pad=2) {
    const result = {};
    for (let name of this.keys()) {
      result[name] = this.get(name);
    }
    return JSON.stringify(result, null, pad);
  }
  reportError(reason, details) {
    this.error = new Error(reason);
    console.warn(reason, details);
  }
}

window.RingCollection = RingCollection;
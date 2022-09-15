const FALLBACK_FETCH_INTERVAL_MS = 6000;

// Simple event emitter abstraction for storage objects to use.
function EventEmitterMixin(base) {
  return class extends base {
    constructor(...args) {
      super(...args);
      this._events = new Map();
    }
    on(topic, listener) {
      if (this._events.has(topic)) {
        this._events.get(topic).add(listener);
      } else {
        this._events.set(topic, new Set([listener]));
      }
    }
    off(topic, listener) {
      if (!this._events.has(topic)) {
        return;
      }
      this._events.get(topic).delete(listener);
    }
    emit(topic, ...args) {
      if (!this._events.has(topic)) {
        return;
      }
      for (let listener of this._events.get(topic).values()) {
        try {
          if (typeof listener.handleTopic == "function") {
            listener.handleTopic(topic, ...args);
          } else {
            listener.apply(this, args);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  };
}

function WatchedRemoteMixin(base) {
  const FALLBACK_INTERVAL_MS = 60000;
  return class extends base {
    constructor(...args) {
      super(...args);
      this._dataRefreshInterval = FALLBACK_FETCH_INTERVAL_MS;
      if (args[0]?.dataRefreshSeconds) {
        this.dataRefreshSeconds = args[0]?.dataRefreshSeconds;
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
    watchRemoteData() {
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
  }
}

class RemoteMap extends EventEmitterMixin(Map) {
  static urlOptionsProperty = "collectionURL";
  static itemIdProperty = "url"; // use "url" as the identifier for data items

  constructor(options = {}, baseURL) {
    super();
    this.remoteBaseURL = baseURL;
    console.log(this.constructor.name + " constructor", options, "base:", baseURL);
    this.options = { ...options };
    let urlKey = this.constructor.urlOptionsProperty;
    let remoteDataURL = this.options[urlKey];
    console.log("RemoteMap ctor, remoteDataURL:", remoteDataURL);
    if (remoteDataURL) {
      this._dataURL = this._prepareDataURL(remoteDataURL, baseURL);
    } else {
      this.reportError(`Missing ${this.urlOptionsProperty} option`);
    }
    console.log(this.constructor.name + " constructor, dataURL", this._dataURL?.href);
  }

  get dataURL() {
    return this._dataURL.href;
  }
  set dataURL(url) {
    this._dataURL = this._prepareDataURL(url, this.remoteBaseURL);
  }
  _prepareDataURL(urlish, baseURL) {
    let dataURL;
    if (urlish instanceof URL) {
      dataURL = urlish;
    } else {
      try {
        dataURL = new URL(urlish, baseURL);
      } catch (ex) {
        // was path only? Resolve as relative to this extension's origin
        if (typeof browser !== "undefined") {
          try {
            const extensionURL = browser.runtime.getURL(urlish);
            dataURL = new URL(extensionURL);
          } catch (ex2) {
            console.warn("RingRegistry exception creating URL from runtime.getURL() Result:", urlish, ex2);
            this.reportError("Bad dataURL", ex2);
          }
        } else {
          try {
            dataURL = new URL(urlish, document?.URL);
          } catch (ex2) {
            console.warn("RingRegistry exception creating URL from document?.URL. Result:", urlish, ex2);
            this.reportError("Bad dataURL", ex2);
          }
        }
      }
    }
    return dataURL;
  }
  fetchData() {
    return this._fetchData();
  }
  _fetchData() {
    console.log("_fetchData with dataURL:", this.dataURL);
    const fetchedPromise = fetch(this.dataURL).then(async (resp) => {
      if (resp.ok) {
        try {
          const json = await resp.json();
          this.populate(json);
          return;
        } catch (ex) {
          this.reportError("Bad response", ex);this.dataURL
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
    this._events.clear();
    this.clear();
  }
  populate(data) {
    this.clear();
    if (data?.entries) {
      let idProperty = this.constructor.itemIdProperty;
      for (let entry of data.entries) {
        this.set(entry[idProperty], entry);
        // console.log(this.constructor.name + ".populate, add entry: id:", entry[idProperty], "entry:", this.get(entry[idProperty]));
      }
    };
  }
  reportError(reason, details) {
    if (details && details instanceof Error) {
      details.message = `${reason}: ${details.message}`;
    }
    this.emit("error", details);
  }
}
window.RemoteMap = RemoteMap;

class URLCollection extends RemoteMap {
  static urlOptionsProperty = "collectionURL";

  fetchData() {
    this._previousData = this.toJSON(2);
    this._lastFetched = Date.now();
    return this._fetchData().then(() => {
      let newSnapshot = this.toJSON(2);
      // console.log("fetchData, old, new:", this._previousData, newSnapshot);
      if (newSnapshot == this._previousData) {
        console.log("No change to remote ring data:", this.dataURL);
      } else {
        this.emit("change", this);
      }
    });
  }
  reset() {
    this.clear();
    if (this._refreshTimerID) {
      clearInterval(this._refreshTimerID);
    }
  }
  toJSON(pad=2) {
    const result = {};
    for (let name of this.keys()) {
      result[name] = this.get(name);
    }
    return JSON.stringify(result, null, pad);
  }
}
window.URLCollection = URLCollection;

class WatchedURLCollection extends WatchedRemoteMixin(URLCollection) {
  constructor(...args) {
    super(...args);

    this._dataRefreshInterval = 60000;
    this._refreshTimerID = null;
    this._lastFetched = 0;
  }
};
window.WatchedURLCollection = WatchedURLCollection;

class RingRegistry extends RemoteMap {
  static urlOptionsProperty = "registryURL";
  static itemIdProperty = "id";
}
window.RingRegistry = RingRegistry;

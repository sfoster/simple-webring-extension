class RingCollection extends Map {
  error = null;

  constructor(dataURL = "data/default.json") {
    super();
    let url = null;
    try {
      url = new URL(dataURL);
    } catch (ex) {
      try {
        const extURL = browser.runtime.getURL(dataURL);
        url = new URL(extURL);
      } catch (ex2) {
        console.warn("RingCollection exception creating URL from runtime.getURL() result:", extURL, ex);
        this.error = new Error("Bad dataURL");
      }
    }
    this._dataURL = url;
  }
  get dataURL() {
    return this._dataURL.href;
  }
  fetchData(tmpURL) {
    this.reset();
    return fetch(tmpURL || this.dataURL).then(async (resp) => {
      if (resp.ok) {
        try {
          const json = await resp.json();
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
  }
  reset() {
    delete this.error;
    this.clear();
  }
  populate(data) {
    this.clear();
    if (data?.entries) {
      for (let entry of data.entries) {
        this.set(entry.url, entry);
      }
    };
  }
  reportError(reason, details) {
    this.error = new Error(reason);
    console.warn(reason, details);
  }
}

window.RingCollection = RingCollection;
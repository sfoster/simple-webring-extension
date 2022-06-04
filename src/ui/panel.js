const MESSAGE_ACTION = "ringAction";
const MESSAGE_DATA_UPDATE = "dataUpdate";
const MESSAGE_READY = "panelReady";

class Panel {
  constructor() {
    console.log("Panel constructor");
    this.ringData = null;
    document.body.addEventListener("click", this);

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("onMessage:", message, sender);
      if (message.action == MESSAGE_DATA_UPDATE) {
        document.body.classList.remove("loading");
        if (message.data) {
          this.updateRingData(message.data);
        }
        if (message.currentUrl) {
          this.updateActiveUrl(message.currentUrl);
        }
      }
    });

    console.log("Panel, sending dataplz message");
    this.sendBackgroundMessage(MESSAGE_READY, "dataplz");
  }
  handleEvent(event) {
    switch (event.target.id) {
      case "back-btn":
        event.stopPropagation();
        this.goTo("back");
        break;
      case "next-btn":
        event.stopPropagation();
        this.goTo("next");
        break;
      case "jump-btn":
        event.stopPropagation();
        this.goTo("random");
        break;
    }
  }
  goTo(where) {
    this.sendBackgroundMessage(MESSAGE_ACTION, where);
    setTimeout(() => window.close()< 500);
  }
  sendBackgroundMessage(action, value) {
    return browser.runtime.sendMessage({
      action: action,
      data: value,
    });
  }
  updateRingData(data) {
    console.log("panel.js, got ring data:", data);
    this.ringData = data;
    this.scheduleRender();
  }
  updateActiveUrl(url) {
    this.activeUrl = url;
    this.scheduleRender();
  }
  scheduleRender() {
    if (!this._rafId) {
      this._rafId = requestAnimationFrame(() => this.render());
    }
  }
  render() {
    this._rafId = null;
    const posnLabel = document.getElementById("posn-label");
    const urls = this.ringData ? Object.keys(this.ringData) : [];
    const idx = this.activeUrl ? urls.indexOf(this.activeUrl) : -1;

    document.body.classList.toggle("inring", idx >= 0);
    if (idx > -1) {
      posnLabel.textContent = `${idx} of ${urls.length}`;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new Panel();
});
const MESSAGE_ACTION = "ringAction";
const MESSAGE_DATA_UPDATE = "dataUpdate";
const MESSAGE_READY = "panelReady";

class Panel {
  constructor() {
    this.ringData = null;
    document.body.addEventListener("click", this);

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("onMessage:", message, sender);
      if (message.action == MESSAGE_DATA_UPDATE) {
        document.body.classList.remove("loading");
        this.updateRingData(message.data);
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
  updateRingData({ ringUrlIndex, ringUrlCount }) {
    this.ringUrlIndex = ringUrlIndex;
    this.ringUrlCount = ringUrlCount;
    console.log("panel.js, got updateRingData:", this.ringUrlIndex);
    this.scheduleRender();
  }
  scheduleRender() {
    if (!this._rafId) {
      this._rafId = requestAnimationFrame(() => this.render());
    }
  }
  render() {
    this._rafId = null;
    const inRing = this.ringUrlIndex > -1;
    const posnLabel = document.getElementById("posn-label");

    document.body.classList.toggle("inring", inRing);
    if (inRing) {
      posnLabel.textContent = `${this.ringUrlIndex} of ${this.ringUrlCount}`;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new Panel();
});
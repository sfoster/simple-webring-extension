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
        console.log("Panel, got data update:", message.data);
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
  updateRingData({ ringURLIndex, ringURLCount, entriesList }) {
    this.ringURLIndex = ringURLIndex;
    this.ringURLCount = ringURLCount;
    this.entriesList = entriesList;
    this.scheduleRender();
  }
  scheduleRender() {
    if (!this._rafId) {
      this._rafId = requestAnimationFrame(() => this.render());
    }
  }
  render() {
    this._rafId = null;
    const inRing = this.ringURLIndex > -1;

    document.body.classList.toggle("inring", inRing);
    if (inRing) {
      const posnLabel = document.getElementById("posn-label");
      const backButton = document.getElementById("back-btn");
      const nextButton = document.getElementById("next-btn");
      const backIndex = this.ringURLIndex <= 0 ? this.ringURLCount - 1 : this.ringURLIndex - 1;
      const nextIndex = this.ringURLIndex >= this.ringURLCount - 1 ? 0 : this.ringURLIndex + 1;

      posnLabel.textContent = `${1+this.ringURLIndex} of ${this.ringURLCount}`;
      backButton.title = `Via ${this.entriesList[backIndex].who ?? "anonymous" }`;
      nextButton.title = `Via ${this.entriesList[nextIndex].who ?? "anonymous" }`;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new Panel();
});
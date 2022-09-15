const MESSAGE_ACTION = "ringAction";
const MESSAGE_REQUEST = "ringRequest";
const MESSAGE_DATA_UPDATE = "dataUpdate";
const MESSAGE_READY = "panelReady";

if (browser == undefined) {
  console.warn("No browser global; this document expects to be run in the context of a browser web-extension");
  var browser = null;
}

class PanelUI extends HTMLElement {
  constructor() {
    super();
    this.ringData = null;
  }
  get metadataDetails() {
    return this.querySelector("#metadata");
  }
  get ringChooser() {
    return this.querySelector("#ring-chooser");
  }
  get ringTitle() {
    return this.querySelector("h1");
  }
  get loading() {
    return this.classList.contains("loading");
  }
  set loading(value) {
    this.classList.toggle("loading", value);
  }
  get ringMetaData() {
    if (!(this.currentRingId && this.ringsById)) {
      return null;
    }
    return this.ringsById[this.currentRingId];
  }
  connectedCallback() {
    this.addEventListener("click", this);
    this.addEventListener("change", this);

    browser?.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("onMessage:", message, sender);
      if (message.action == MESSAGE_DATA_UPDATE) {
        this.loading = false;
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
      case "ring-chooser": {
        if (event.type == "change") {
          let selectedOption = this.ringChooser.options[this.ringChooser.selectedIndex];
          console.log("new ring chosen:", selectedOption.value);
          this.requestRing(selectedOption.value);
          this.loading = true;
        }
        break;
      }
    }
    this.metadataDetails.open = false;
  }
  goTo(where) {
    this.sendBackgroundMessage(MESSAGE_ACTION, where);
    setTimeout(() => window.close()< 500);
  }
  requestRing(ringId) {
    this.sendBackgroundMessage(MESSAGE_REQUEST, ringId);
  }
  sendBackgroundMessage(action, value) {
    return browser?.runtime.sendMessage({
      action: action,
      data: value,
    });
  }
  updateRingData({ ringURLIndex, ringURLCount, entriesList, ringsById, currentRingId }) {
    this.ringURLIndex = ringURLIndex;
    this.ringURLCount = ringURLCount;
    this.entriesList = entriesList;
    this.ringsById = ringsById;
    this.currentRingId = currentRingId;

    console.log("updateRingData:", { ringURLIndex, ringURLCount, entriesList, ringsById, currentRingId });
    this.scheduleRender();
  }
  populateRingList() {
    this.ringChooser.options.length = 0;
    if (!this.ringsById) {
      return;
    }
    for (let [id, metadata] of Object.entries(this.ringsById)) {
      let option = new Option(metadata.title, id, id === this.currentRingId);
      this.ringChooser.options.add(option);
    }
    this.ringChooser.size = Math.max(2, Math.min(8, this.ringChooser.options.length));
  }
  scheduleRender() {
    if (!this._rafId) {
      this._rafId = requestAnimationFrame(() => this.render());
    }
  }
  render() {
    this._rafId = null;
    const inRing = this.ringURLIndex > -1;

    this.classList.toggle("inring", inRing);
    this.populateRingList();

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
    this.ringTitle.textContent = this.ringMetaData.title;
  }
}
window.customElements.define("panel-ui", PanelUI);

window.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded. Got panel-uis? ", window.customElements.get("panel-ui"));
});


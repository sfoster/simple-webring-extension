const FALLBACK_REGISTRY_URL = "data/rings.json";

window.config = {
  registryURL: FALLBACK_REGISTRY_URL,
  // registryURL: "https://raw.githubusercontent.com/sfoster/simple-webring-extension/main/src/data/rings.json",
  selectedRing: "default",
  dataRefreshSeconds: 3600, // how often to ping for updated ring data
};

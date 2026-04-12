const path = require("path");

let configStore;

async function initConfigStore() {
  const Conf = (await import("conf")).default;
  configStore = new Conf({ projectName: "prompt-for-ai" });
}

function projectKey(projectPath) {
  return projectPath.replace(/[\\/:]/g, "_");
}

function loadConfig() {
  const defaults = {
    lang: null,
    lastPath: process.cwd(),
    favorites: [],
    recentProjects: [],
    exportFormat: "txt",
    tokenLimit: 0,
    excludePatterns: ["*.test.js", "*.spec.ts", "*.min.js", "*.map"],
    globalExcludedFolders: [],
    projectSettings: {},
  };
  return { ...defaults, ...configStore.store };
}

function saveConfig(config) {
  configStore.set(config);
}

function getLastRun(config, projectPath) {
  const key = projectKey(projectPath);
  const ps = config.projectSettings[key];
  if (!ps || !ps.lastRun) return null;
  return ps.lastRun;
}

function saveLastRun(config, projectPath, { excludedFolders, selectedFiles }) {
  const key = projectKey(projectPath);
  if (!config.projectSettings[key]) config.projectSettings[key] = {};
  config.projectSettings[key].lastRun = {
    excludedFolders,
    selectedFiles,
    timestamp: new Date().toISOString(),
  };
  saveConfig(config);
}

function addToRecent(config, projectPath) {
  config.recentProjects = config.recentProjects.filter(
    (p) => p !== projectPath
  );
  config.recentProjects.unshift(projectPath);
  config.recentProjects = config.recentProjects.slice(0, 10);
}

module.exports = {
  initConfigStore,
  loadConfig,
  saveConfig,
  getLastRun,
  saveLastRun,
  addToRecent,
};

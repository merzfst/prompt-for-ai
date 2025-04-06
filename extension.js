#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { search, checkbox, select } = require("@inquirer/prompts");

const messages = require("./lang.json");
const configPath = path.join(__dirname, "project_prompt_config.json");

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
  } catch (err) {
    console.error(
      messages[lang]?.configLoadError || "Config load error:",
      err.message
    );
  }
  return { lastPath: process.cwd(), lastFiles: [] };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  } catch (err) {
    console.error(
      messages[lang]?.configSaveError || "Config save error:",
      err.message
    );
  }
}

let lang = "ru";

async function promptPath(defaultPath) {
  let currentPath = path.resolve(defaultPath);

  while (true) {
    const dirs = fs.readdirSync(currentPath).filter((entry) => {
      const fullPath = path.join(currentPath, entry);
      return fs.statSync(fullPath).isDirectory();
    });

    const choices = [
      { name: messages[lang].selectThisFolder, value: "select" },
      { name: messages[lang].back, value: ".." },
      ...dirs.map((dir) => ({ name: dir, value: dir })),
    ];

    const choice = await search({
      message: `${messages[lang].enterPath}: ${currentPath}`,
      source: async (input) => {
        if (!input) return choices;
        const lowerInput = input.toLowerCase();
        return choices.filter((choice) =>
          choice.name.toLowerCase().includes(lowerInput)
        );
      },
    });

    if (choice === "select") {
      return currentPath;
    } else if (choice === "..") {
      currentPath = path.dirname(currentPath);
    } else {
      currentPath = path.join(currentPath, choice);
    }
  }
}

function getAllFiles(dir, files = []) {
  const excluded = new Set(["node_modules", ".git", "dist", "build", "out"]);
  const allowed = new Set([
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".py",
    ".java",
    ".c",
    ".cpp",
    ".cs",
    ".rb",
    ".go",
    ".php",
    ".html",
    ".css",
    ".json",
    ".xml",
    ".sh",
    ".yml",
    ".yaml",
  ]);

  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!excluded.has(entry)) getAllFiles(fullPath, files);
    } else if (allowed.has(path.extname(entry).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

function generateTree(root, files) {
  const tree = {};
  files.forEach((file) => {
    const parts = path.relative(root, file).split(path.sep);
    let node = tree;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) node[part] = file;
      else {
        node[part] = node[part] || {};
        node = node[part];
      }
    });
  });
  return tree;
}

function treeToString(tree, indent = "") {
  let str = "";
  for (const key in tree) {
    if (typeof tree[key] === "string") str += `${indent}- ${key}\n`;
    else {
      str += `${indent}+ ${key}\n`;
      str += treeToString(tree[key], indent + "  ");
    }
  }
  return str;
}

async function createPrompt() {
  const config = loadConfig();
  if (!config.lang) {
    config.lang = await select({
      message: messages[lang].selectLanguage,
      choices: [
        { name: "English", value: "en" },
        { name: "Русский", value: "ru" },
      ],
    });
    saveConfig(config);
  }
  lang = config.lang;

  let projectRoot,
    selectedFiles = [];
  if (config.lastPath && config.lastFiles.length) {
    if (
      fs.existsSync(config.lastPath) &&
      fs.statSync(config.lastPath).isDirectory()
    ) {
      const usePrev = await select({
        message: `${messages[lang].usePreviousSelection} (${config.lastPath})`,
        choices: [
          { name: messages[lang].yes, value: true },
          { name: messages[lang].no, value: false },
        ],
      });
      if (usePrev) {
        projectRoot = config.lastPath;
        selectedFiles = config.lastFiles;
      }
    }
  }

  if (!projectRoot) {
    projectRoot = await promptPath(config.lastPath || process.cwd());
    config.lastPath = projectRoot;
    const allFiles = getAllFiles(projectRoot);
    const tree = generateTree(projectRoot, allFiles);
    console.log(`\n${messages[lang].projectStructure}\n${treeToString(tree)}`);
    selectedFiles = await checkbox({
      message: messages[lang].selectFiles,
      choices: [
        { name: messages[lang].selectAllFiles, value: "ALL" },
        ...allFiles.map((file) => ({
          name: path.relative(projectRoot, file),
          value: file,
        })),
      ],
    });
    if (selectedFiles.includes("ALL")) {
      const allActualFiles = allFiles.filter((f) => f !== "ALL");

      selectedFiles = allActualFiles.filter(
        (file) =>
          path.basename(file) !== "package-lock.json" &&
          path.basename(file) !== ".env"
      );
    }

    config.lastFiles = selectedFiles;
    saveConfig(config);
  }

  const allFiles = getAllFiles(projectRoot);
  const tree = generateTree(projectRoot, allFiles);
  const treeStr = treeToString(tree);
  let promptContent = `${messages[lang].projectStructureLabel}\n${treeStr}\n${messages[lang].selectedFilesContent}\n`;
  for (const file of selectedFiles) {
    const rel = path.relative(projectRoot, file);
    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch (err) {
      content = messages[lang].fileReadError;
    }
    promptContent += `\n==== ${rel} ====\n${content}\n`;
  }
  console.log(`\n${messages[lang].generatedPrompt}\n${promptContent}`);
  fs.writeFileSync(path.join(projectRoot, "prompt.txt"), promptContent, "utf8");
  console.log(
    `\n${messages[lang].promptSaved} ${path.join(projectRoot, "prompt.txt")}`
  );
}

process.on("unhandledRejection", (error) => {
  console.error(messages[lang].errorOccurred, error.message);
  process.exit(1);
});

createPrompt();

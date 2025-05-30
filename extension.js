#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { search, checkbox, select, confirm } = require("@inquirer/prompts"); //

const messages = require("./lang.json");
const configPath = path.join(__dirname, "project_prompt_config.json");
const allowedExtensions = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".py",
  ".pyw",
  ".java",
  ".c",
  ".h",
  ".cpp",
  ".hpp",
  ".cc",
  ".cxx",
  ".cs",
  ".rb",
  ".go",
  ".php",
  ".phtml",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".ps1",
  ".psm1",
  ".psd1",
  ".swift",
  ".kt",
  ".kts",
  ".scala",
  ".sc",
  ".rs",
  ".lua",
  ".pl",
  ".pm",
  ".r",
  ".R",
  ".jl",
  ".ex",
  ".exs",
  ".erl",
  ".hrl",
  ".clj",
  ".cljs",
  ".cljc",
  ".edn",
  ".fs",
  ".fsi",
  ".fsx",
  ".dart",
  ".m",
  ".mm",
  ".groovy",
  ".d",
  ".di",
  ".asm",
  ".s",
  ".S",
  ".pas",
  ".pp",
  ".dpr",
  ".lpr",
  ".f",
  ".for",
  ".f90",
  ".f95",
  ".f03",
  ".f08",
  ".ada",
  ".adb",
  ".ads",
  ".lisp",
  ".lsp",
  ".cl",
  ".scm",
  ".ss",
  ".pro",
  ".tcl",
  ".vhd",
  ".vhdl",
  ".v",
  ".sv",
  ".svh",
  ".cr",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".styl",
  ".vue",
  ".svelte",
  ".json",
  ".jsonc",
  ".json5",
  ".xml",
  ".xsd",
  ".xsl",
  ".xslt",
  ".dtd",
  ".yml",
  ".yaml",
  ".toml",
  ".ini",
  ".cfg",
  ".conf",
  ".config",
  ".properties",
  ".env",
  ".csv",
  ".tsv",
  ".graphql",
  ".gql",
  ".proto",
  ".avsc",
  ".avro",
  ".tf",
  ".tfvars",
  ".tfstate",
  ".tfstate.backup",
  ".sql",
  ".ddl",
  ".dml",
  ".gradle",
  ".kts",
  ".pom",
  ".csproj",
  ".vbproj",
  ".fsproj",
  ".sln",
  ".xcconfig",
  ".plist",
  ".url",
  ".desktop",
  ".ipynb",
  ".md",
  ".markdown",
  ".txt",
  ".text",
  ".rst",
  ".asciidoc",
  ".adoc",
  ".tex",
  ".cls",
  ".sty",
  ".bib",
  ".rtf",
  ".plantuml",
  ".puml",
  ".pu",
  ".mermaid",
  ".mmd",
  ".patch",
  ".diff",
  ".sub",
  ".srt",
  ".cmake",
  ".ld",
  ".map",
  ".gdb",
  ".mk",
  ".gitattributes",
  ".editorconfig",
  ".lock",
  ".mod",
  ".sum",
  ".gemspec",
]);

const allowedFilenames = new Set([
  "makefile",
  "gnumakefile",
  "dockerfile",
  "cmakelists.txt",
  "sdkconfig",
  "kconfig",
  "kconfig.projbuild",
  "gemfile",
  "rakefile",
  "procfile",
  "requirements.txt",
  "pipfile",
  ".gitignore",
  ".gitattributes",
  ".editorconfig",
  "license",
  "copying",
  "readme",
  "notice",
  "changelog",
  "contributing",
  "authors",
  "credits",
  "vagrantfile",
  "jenkinsfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "netlify.toml",
  "vercel.json",
  "gatsby-config.js",
  "next.config.js",
  "tailwind.config.js",
  "postcss.config.js",
  "babel.config.js",
  "tsconfig.json",
  "jsconfig.json",
  "vite.config.js",
  "vite.config.ts",
  "webpack.config.js",
]);

let lang = "ru";

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
  } catch (err) {
    console.error(
      (messages[lang]?.configLoadError || "Config load error:") +
        ` ${err.message}`
    );
  }
  return { lastPath: process.cwd(), lastFiles: [], lang: lang };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  } catch (err) {
    console.error(
      (messages[lang]?.configSaveError || "Config save error:") +
        ` ${err.message}`
    );
  }
}

async function promptPath(defaultPath) {
  let currentPath = path.resolve(defaultPath);

  while (true) {
    let entries = [];
    try {
      entries = fs.readdirSync(currentPath);
    } catch (e) {
      const parentDir = path.dirname(currentPath);
      if (parentDir === currentPath) {
        console.error(
          `Cannot read directory ${currentPath}. Please check permissions.`
        );
        return null;
      }
      currentPath = parentDir;
      continue;
    }

    const dirs = entries.filter((entry) => {
      try {
        const fullPath = path.join(currentPath, entry);
        return fs.statSync(fullPath).isDirectory();
      } catch {
        return false;
      }
    });

    const choices = [
      { name: messages[lang].selectThisFolder, value: "select" },
      { name: messages[lang].back, value: ".." },
      ...dirs.map((dir) => ({ name: dir, value: dir })),
    ];

    try {
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
    } catch (e) {
      console.log(
        messages[lang].pathSelectionCancelled || "Path selection cancelled."
      );
      return null;
    }
  }
}

function getAllFiles(dir, files = []) {
  const excludedFolders = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    "out",
    "__pycache__",
    ".vscode",
    ".idea",
    "target",
    "obj",
    "bin",
    ".svn",
    "venv",
    ".venv",
    "env",
    ".env",
  ]);

  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (!excludedFolders.has(entry.toLowerCase())) {
            getAllFiles(fullPath, files);
          }
        } else {
          const ext = path.extname(entry).toLowerCase();
          const filenameLower = entry.toLowerCase();
          if (
            allowedExtensions.has(ext) ||
            allowedFilenames.has(filenameLower)
          ) {
            files.push(fullPath);
          }
        }
      } catch (statErr) {
        console.warn(`Cannot access: ${fullPath}. Skipping.`);
      }
    }
  } catch (readDirErr) {
    console.warn(`Cannot read directory: ${dir}. Skipping.`);
  }
  return files;
}

function generateTree(root, files) {
  const tree = {};
  files.forEach((file) => {
    const parts = path.relative(root, file).split(path.sep);
    let node = tree;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) {
        node[part] = file;
      } else {
        node[part] = node[part] || {};
        node = node[part];
      }
    });
  });
  return tree;
}

function treeToString(tree, indent = "") {
  let str = "";
  const keys = Object.keys(tree).sort((a, b) => {
    // Сортировка для консистентности
    const isADir = typeof tree[a] === "object";
    const isBDir = typeof tree[b] === "object";
    if (isADir && !isBDir) return -1;
    if (!isADir && isBDir) return 1;
    return a.localeCompare(b);
  });

  for (const key of keys) {
    if (typeof tree[key] === "string") {
      // Файл
      str += `${indent}- ${key}\n`;
    } else {
      // Папка
      str += `${indent}+ ${key}\n`;
      str += treeToString(tree[key], indent + "  ");
    }
  }
  return str;
}

async function createPrompt() {
  let config = loadConfig();
  lang = config.lang || "ru";

  if (!config.lang) {
    try {
      config.lang = await select({
        message: "Select language / Выберите язык:",
        choices: [
          { name: "English", value: "en" },
          { name: "Русский", value: "ru" },
        ],
      });
      lang = config.lang;
      saveConfig(config);
    } catch (e) {
      console.log("Language selection cancelled. Exiting.");
      return;
    }
  }

  let projectRoot;
  let selectedFiles = [];
  let forceReselectPathAndFiles = false;
  let initialPathSuggestion = config.lastPath || process.cwd();

  if (config.lastPath) {
    let pathToCheck = path.resolve(config.lastPath);
    if (
      !fs.existsSync(pathToCheck) ||
      !fs.statSync(pathToCheck).isDirectory()
    ) {
      console.warn(
        (
          messages[lang].lastPathInvalid ||
          'Warning: The saved path "{savedPath}" is no longer valid.'
        ).replace("{savedPath}", config.lastPath)
      );
      forceReselectPathAndFiles = true;
      let newSuggestion = pathToCheck;
      while (true) {
        const parent = path.dirname(newSuggestion);
        if (parent === newSuggestion) {
          // Достигли корня
          initialPathSuggestion = process.cwd();
          console.warn(
            (
              messages[lang].defaultingToCwd ||
              "Defaulting to current working directory: {path}"
            ).replace("{path}", initialPathSuggestion)
          );
          break;
        }
        try {
          if (fs.existsSync(parent) && fs.statSync(parent).isDirectory()) {
            initialPathSuggestion = parent;
            console.warn(
              (
                messages[lang].suggestingParentDir ||
                "Suggesting last valid parent directory: {path}"
              ).replace("{path}", initialPathSuggestion)
            );
            break;
          }
        } catch (e) {}
        newSuggestion = parent;
      }
      config.lastFiles = [];
    }
  } else {
    forceReselectPathAndFiles = true;
  }

  if (
    !forceReselectPathAndFiles &&
    config.lastPath &&
    config.lastFiles &&
    config.lastFiles.length > 0
  ) {
    try {
      const usePrev = await select({
        message: `${messages[lang].usePreviousSelection} (${config.lastPath})?`,
        choices: [
          { name: messages[lang].yes, value: true },
          { name: messages[lang].no, value: false },
        ],
      });
      if (usePrev) {
        projectRoot = config.lastPath;
        selectedFiles = config.lastFiles.filter((f) => fs.existsSync(f));
        if (
          selectedFiles.length !== config.lastFiles.length &&
          selectedFiles.length > 0
        ) {
          console.warn(messages[lang].someFilesMissing);
          config.lastFiles = selectedFiles;
          saveConfig(config);
        }
        if (selectedFiles.length === 0) {
          console.warn(messages[lang].allFilesMissing);
          forceReselectPathAndFiles = true;
          projectRoot = undefined;
        }
      } else {
        forceReselectPathAndFiles = true;
      }
    } catch (e) {
      console.log(messages[lang].pathSelectionCancelled);
      return;
    }
  } else {
    forceReselectPathAndFiles = true;
  }

  if (forceReselectPathAndFiles || !projectRoot) {
    projectRoot = await promptPath(initialPathSuggestion);
    if (!projectRoot) return;

    config.lastPath = projectRoot;
    const allFiles = getAllFiles(projectRoot);

    if (allFiles.length === 0) {
      console.log(messages[lang].noFilesFound);
      config.lastFiles = [];
      saveConfig(config);
      return;
    }

    const treeForDisplay = generateTree(projectRoot, allFiles);
    console.log(
      `\n${messages[lang].projectStructure}\n${treeToString(treeForDisplay)}`
    );

    const fileChoices = [];
    if (allFiles.length > 0) {
      fileChoices.push({
        name: messages[lang].selectAllFiles,
        value: "ALL_FILES_MAGIC_STRING",
      });
    }
    fileChoices.push(
      ...allFiles.map((file) => ({
        name: path.relative(projectRoot, file),
        value: file,
      }))
    );

    try {
      selectedFiles = await checkbox({
        message: messages[lang].selectFiles,
        choices: fileChoices,
        pageSize: Math.min(20, process.stdout.rows - 5),
      });
    } catch (e) {
      console.log(messages[lang].pathSelectionCancelled);
      return;
    }

    if (selectedFiles.includes("ALL_FILES_MAGIC_STRING")) {
      selectedFiles = allFiles.filter((file) => {
        const basenameLower = path.basename(file).toLowerCase();
        return (
          basenameLower !== "package-lock.json" &&
          basenameLower !== "yarn.lock" &&
          basenameLower !== "pnpm-lock.yaml" &&
          !basenameLower.startsWith(".env") &&
          basenameLower !== "prompt.txt"
        );
      });
    }
    config.lastFiles = selectedFiles;
    saveConfig(config);
  }

  if (!projectRoot || !selectedFiles || selectedFiles.length === 0) {
    console.log(messages[lang].noFilesSelectedForPrompt);
    return;
  }

  const finalDisplayAllFiles = getAllFiles(projectRoot);
  const treeStr = treeToString(generateTree(projectRoot, finalDisplayAllFiles));
  let promptContent = `${messages[lang].projectStructureLabel}\n${treeStr}\n${messages[lang].selectedFilesContent}\n`;

  for (const file of selectedFiles) {
    if (!fs.existsSync(file)) {
      const relPath = path.relative(projectRoot, file);
      promptContent += `\n==== ${relPath} (File not found during prompt generation) ====\n`;
      continue;
    }
    const relPath = path.relative(projectRoot, file);
    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch (err) {
      const errorMsg = (
        messages[lang].fileReadErrorSpecific ||
        "Error reading file {file}: {error}"
      )
        .replace("{file}", relPath)
        .replace("{error}", err.message);
      console.error(errorMsg);
      content = messages[lang].fileReadError;
    }
    promptContent += `\n==== ${relPath} ====\n${content}\n`;
  }

  const promptFilePath = path.join(projectRoot, "prompt.txt");
  fs.writeFileSync(promptFilePath, promptContent, "utf8");
  console.log(`\n${messages[lang].generatedPrompt}`);
  console.log(promptContent);
  console.log(`\n${messages[lang].promptSaved} ${promptFilePath}`);
}

process.on("SIGINT", () => {
  process.exit(0);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    (messages[lang]?.errorOccurred || "Unhandled Rejection at:") + " Promise",
    promise,
    "reason:",
    reason
  );
});

createPrompt().catch((error) => {
  if (error.message.includes("User force closed")) {
    console.log(
      "\n" +
        (messages[lang]?.pathSelectionCancelled ||
          "Operation cancelled by user.")
    );
  } else {
    console.error(
      (messages[lang]?.errorOccurred || "An unexpected error occurred:") +
        ` ${error.message}`
    );
    console.error(error.stack);
  }
  process.exit(1);
});

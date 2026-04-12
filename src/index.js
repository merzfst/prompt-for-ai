#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { select, confirm, input } = require("@inquirer/prompts");
const { encode } = require("gpt-tokenizer");

const {
  initConfigStore,
  loadConfig,
  saveConfig,
  addToRecent,
  getLastRun,
  saveLastRun,
} = require("./config");
const { setLang, getLang, t } = require("./lang");
const {
  formatSize,
  generateTree,
  treeToString,
  defaultExcludedFolders,
} = require("./files");
const { exportPrompt } = require("./export");
const { selectProject, manageFavorites } = require("./ui/menu");
const { promptPath } = require("./ui/browser");
const { selectFoldersToProcess } = require("./ui/folders");
const { selectFiles } = require("./ui/fileSelect");
const { openSettings } = require("./ui/settings");

let chalk, boxen, clipboard;

async function loadEsmModules() {
  chalk = (await import("chalk")).default;
  boxen = (await import("boxen")).default;
  clipboard = (await import("clipboardy")).default;
}

async function main() {
  await loadEsmModules();
  await initConfigStore();

  let config = loadConfig();

  if (!config.lang) {
    config.lang = await select({
      message: "Select language / Выберите язык:",
      choices: [
        { name: "English", value: "en" },
        { name: "Русский", value: "ru" },
      ],
    });
    saveConfig(config);
  }

  setLang(config.lang);

  console.log(`\n🚀 ${chalk.cyan.bold(t("welcome"))}\n`);

  while (true) {
    let projectRoot = null;
    let useLastRun = null;

    // ── Выбор проекта ──
    while (!projectRoot) {
      let choice;
      try {
        choice = await selectProject(config, chalk);
      } catch {
        return;
      }

      if (!choice) return;

      if (choice.type === "exit") return;

      if (choice.type === "repeatLast") {
        projectRoot = choice.path;
        useLastRun = choice.lastRun;
      } else if (choice.type === "project") {
        projectRoot = choice.path;
      } else if (choice.type === "browse") {
        projectRoot = await promptPath(config.lastPath || process.cwd());
      } else if (choice.type === "manual") {
        try {
          const manualPath = await input({
            message: t("enterPath"),
            default: config.lastPath || process.cwd(),
          });
          const resolved = path.resolve(manualPath);
          if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
            projectRoot = resolved;
          } else {
            console.log(chalk.red(t("invalidPath")));
          }
        } catch {
          return;
        }
      } else if (choice.type === "manageFavorites") {
        await manageFavorites(config, chalk);
        saveConfig(config);
        continue;
      } else if (choice.type === "settings") {
        await openSettings(config, chalk);
        config = loadConfig();
        setLang(config.lang);
        continue;
      }
    }

    if (!projectRoot) return;

    addToRecent(config, projectRoot);
    config.lastPath = projectRoot;
    saveConfig(config);

    console.log(
      `\n📍 ${chalk.bold(t("selectedProject"))}: ${chalk.green(projectRoot)}\n`
    );

    if (!config.favorites.includes(projectRoot)) {
      try {
        const addFav = await confirm({
          message: `⭐ ${t("addToFavorites")}?`,
          default: false,
        });
        if (addFav) {
          config.favorites.push(projectRoot);
          saveConfig(config);
        }
      } catch (e) {
        throw e; // Ctrl+C должен завершать приложение
      }
    }

    if (useLastRun) {
      const validFiles = useLastRun.selectedFiles.filter((f) =>
        fs.existsSync(f)
      );
      if (validFiles.length > 0) {
        return await runExport(
          projectRoot,
          validFiles,
          useLastRun.excludedFolders,
          config,
          chalk,
          boxen,
          clipboard
        );
      }
    }

    // ── Папки → Файлы → Экспорт (с возможностью «Назад») ──
    let exported = false;
    while (!exported) {
      const lastRun = getLastRun(config, projectRoot);
      const folderSelection = await selectFoldersToProcess(
        projectRoot,
        config,
        lastRun,
        chalk
      );

      if (!folderSelection) break; // ← назад к выбору проекта

      if (
        !folderSelection.includedFolders ||
        folderSelection.includedFolders.length === 0
      ) {
        console.log(chalk.yellow(t("noFilesFound")));
        continue;
      }

      const selectedFiles = await selectFiles(
        projectRoot,
        config,
        folderSelection,
        chalk
      );

      // null = нажали «Назад» → выходим из внутреннего цикла, внешний показывает выбор проекта
      if (selectedFiles === null) break;

      // пустой массив = ничего не выбрали → возвращаемся к выбору папок
      if (selectedFiles.length === 0) {
        console.log(chalk.yellow(t("noFilesSelected")));
        continue;
      }

      saveLastRun(config, projectRoot, {
        excludedFolders: folderSelection.excludedFolders,
        selectedFiles,
      });

      await runExport(
        projectRoot,
        selectedFiles,
        folderSelection.excludedFolders,
        config,
        chalk,
        boxen,
        clipboard
      );
      exported = true;
    }

    if (exported) return;
    // иначе — внешний while заново покажет выбор проекта
  }
}

async function runExport(
  projectRoot,
  selectedFiles,
  excludedFolders,
  config,
  chalk,
  boxen,
  clipboard
) {
  const formatChoice = await select({
    message: t("exportFormat"),
    choices: [
      { name: `📄 ${t("exportTxt")}`, value: "txt" },
      { name: `🗜️  ${t("exportPdf")}`, value: "pdf" },
    ],
    default: config.exportFormat || "txt",
  });
  config.exportFormat = formatChoice;
  saveConfig(config);

  console.log(`\n⚡ ${chalk.yellow(t("generating"))}...`);

  const treeStr = treeToString(generateTree(projectRoot, selectedFiles));
  let promptContent = `${t("projectStructureLabel")}\n${treeStr}\n${t(
    "selectedFilesContent"
  )}\n`;
  let totalSize = 0;

  for (const file of selectedFiles) {
    const relPath = path.relative(projectRoot, file);
    if (!fs.existsSync(file)) {
      promptContent += `\n==== ${relPath} (File not found) ====\n`;
      continue;
    }
    try {
      const content = fs.readFileSync(file, "utf8");
      totalSize += Buffer.byteLength(content);
      promptContent += `\n==== ${relPath} ====\n${content}\n`;
    } catch {
      promptContent += `\n==== ${relPath} ====\n[Error reading file]\n`;
    }
  }

  const tokensCount = encode(promptContent).length;

  if (config.tokenLimit > 0 && tokensCount > config.tokenLimit) {
    console.log(
      chalk.red(
        `\n${t(
          "tokenWarning"
        )}: ${tokensCount.toLocaleString()} > ${config.tokenLimit.toLocaleString()}`
      )
    );
    try {
      const cont = await confirm({
        message: t("continueAnyway"),
        default: false,
      });
      if (!cont) return;
    } catch (e) {
      throw e;
    }
  }

  const { savedPath, gitignoreUpdated } = await exportPrompt(
    promptContent,
    projectRoot,
    formatChoice
  );

  let copiedToClipboard = false;
  if (formatChoice === "txt") {
    try {
      clipboard.writeSync(promptContent);
      copiedToClipboard = true;
    } catch {}
  }

  const lines = [
    chalk.green.bold(`✅ ${t("promptSaved")} ${savedPath}`),
    gitignoreUpdated ? chalk.gray(t("gitignoreUpdated")) : "",
    copiedToClipboard
      ? chalk.blue.bold(
          `📋 ${
            getLang() === "ru" ? "Скопировано в буфер!" : "Copied to clipboard!"
          }`
        )
      : "",
    "",
    chalk.white(`📊 ${t("stats")}:`),
    chalk.gray(
      `   📁 ${t("filesCount")}: ${chalk.yellow(selectedFiles.length)}`
    ),
    chalk.gray(
      `   💾 ${t("totalSize")}: ${chalk.yellow(formatSize(totalSize))}`
    ),
    chalk.gray(
      `   📝 ${t("estimatedTokens")}: ${
        config.tokenLimit > 0 && tokensCount > config.tokenLimit
          ? chalk.red(`~${tokensCount.toLocaleString()} ⚠️`)
          : chalk.magenta(`~${tokensCount.toLocaleString()}`)
      }`
    ),
  ]
    .filter(Boolean)
    .join("\n");

  console.log(
    "\n" +
      boxen(lines, {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: "cyan",
      })
  );
}

process.on("SIGINT", () => {
  if (chalk) console.log(`\n👋 ${chalk.yellow("Bye!")}`);
  else console.log("\n👋 Bye!");
  process.exit(0);
});

main().catch((err) => {
  if (err?.message?.includes("User force closed")) {
    console.log("\n" + t("pathSelectionCancelled"));
  } else {
    console.error(`Error: ${err.message}`);
    console.error(err.stack);
  }
  process.exit(1);
});

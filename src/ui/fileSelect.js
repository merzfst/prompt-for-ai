const fs = require("fs");
const path = require("path");
const { select, confirm } = require("@inquirer/prompts");
const {
  getAllFiles,
  formatSize,
  defaultExcludedFolders,
  isAllowed,
} = require("../files");
const { t } = require("../lang");
const { saveConfig } = require("../config");

function estimateTokensForFile(filePath) {
  try {
    return Math.ceil(fs.statSync(filePath).size / 4);
  } catch {
    return 0;
  }
}

function projectKey(projectPath) {
  return projectPath.replace(/[\\/:]/g, "_");
}

function loadSavedSelection(config, projectRoot) {
  const key = projectKey(projectRoot);
  const ps = config.projectSettings?.[key];
  if (!ps?.lastSelectedFiles?.length) return null;
  const valid = ps.lastSelectedFiles.filter((f) => fs.existsSync(f));
  return valid.length > 0 ? valid : null;
}

function saveSelection(config, projectRoot, selectedFiles) {
  const key = projectKey(projectRoot);
  if (!config.projectSettings) config.projectSettings = {};
  if (!config.projectSettings[key]) config.projectSettings[key] = {};
  config.projectSettings[key].lastSelectedFiles = selectedFiles;
  saveConfig(config);
}

async function selectFiles(projectRoot, config, folderSelection, chalk) {
  const { includedFolders, excludedFolders } = folderSelection;

  const globalExcluded = new Set([
    ...defaultExcludedFolders,
    ...(config.globalExcludedFolders || []),
    ...excludedFolders.map((f) => f.toLowerCase()),
  ]);

  let allFiles = [];

  for (const folder of includedFolders) {
    const folderPath = path.join(projectRoot, folder);
    if (fs.existsSync(folderPath)) {
      allFiles.push(
        ...getAllFiles(folderPath, {
          excludedFolders: globalExcluded,
          excludePatterns: config.excludePatterns,
        })
      );
    }
  }

  const lockFiles = new Set([
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "prompt.txt",
    "prompt.pdf",
  ]);
  try {
    for (const entry of fs.readdirSync(projectRoot)) {
      const full = path.join(projectRoot, entry);
      try {
        if (!fs.statSync(full).isDirectory()) {
          if (!isAllowed(entry)) continue;
          if (lockFiles.has(entry.toLowerCase())) continue;
          const skip = (config.excludePatterns || []).some((p) =>
            p.startsWith("*") ? entry.endsWith(p.slice(1)) : entry === p
          );
          if (!skip) allFiles.push(full);
        }
      } catch {}
    }
  } catch {}

  if (allFiles.length === 0) {
    console.log(chalk.yellow(t("noFilesFound")));
    return [];
  }

  allFiles = [...new Set(allFiles)].sort((a, b) =>
    path.relative(projectRoot, a).localeCompare(path.relative(projectRoot, b))
  );

  const savedSelection = loadSavedSelection(config, projectRoot);
  if (savedSelection) {
    console.log(
      chalk.gray(
        `\n💾 ${t("usePreviousFiles")}: ${chalk.yellow(
          savedSelection.length
        )} ${t("filesCount").toLowerCase()}`
      )
    );
    try {
      const useSaved = await confirm({
        message: t("usePreviousFiles") + "?",
        default: true,
      });
      if (useSaved) return savedSelection;
    } catch (e) {
      throw e; // Ctrl+C должен завершать приложение
    }
  }

  const filesByFolder = {};
  for (const file of allFiles) {
    const rel = path.relative(projectRoot, file);
    const parts = rel.split(path.sep);

    let folderKey;
    if (parts.length === 1) {
      folderKey = ".";
    } else if (parts.length === 2) {
      folderKey = parts[0];
    } else {
      folderKey = parts.slice(0, 2).join("/");
    }

    if (!filesByFolder[folderKey]) filesByFolder[folderKey] = [];
    filesByFolder[folderKey].push(file);
  }

  const allFolderKeys = Object.keys(filesByFolder).sort();

  const topLevelFolders = new Set();
  for (const key of allFolderKeys) {
    if (key === ".") continue;
    const top = key.split("/")[0];
    topLevelFolders.add(top);
  }

  let checkedFiles = new Set(allFiles);

  let lastCursor = "DONE";

  while (true) {
    const totalEstTokens = [...checkedFiles].reduce(
      (sum, f) => sum + estimateTokensForFile(f),
      0
    );

    const tokenInfo =
      config.tokenLimit > 0
        ? totalEstTokens > config.tokenLimit
          ? chalk.red(
              `⚠️  ~${totalEstTokens.toLocaleString()} ${t(
                "estimatedTokens"
              )} (лимит: ${config.tokenLimit.toLocaleString()})`
            )
          : chalk.green(
              `✅ ~${totalEstTokens.toLocaleString()} ${t("estimatedTokens")}`
            )
        : chalk.gray(
            `~${totalEstTokens.toLocaleString()} ${t("estimatedTokens")}`
          );

    const choices = [];

    choices.push({
      name: chalk.green.bold(
        `✅ ${t("selectFiles")} — готово (${
          checkedFiles.size
        } выбрано)  ${tokenInfo}`
      ),
      value: "DONE",
    });
    choices.push({
      name: `🔥 ${t("selectAllFiles")} (${allFiles.length})`,
      value: "ALL_FILES",
    });
    choices.push({
      name: `💻 ${t("selectOnlyCode")}`,
      value: "CODE_ONLY",
    });
    choices.push({
      name: `↩️  ${t("back")}`,
      value: "BACK",
    });
    choices.push({
      name: "───────────────────────────────",
      value: null,
      disabled: true,
    });

    if (filesByFolder["."]) {
      const folderFiles = filesByFolder["."];
      const selectedInFolder = folderFiles.filter((f) => checkedFiles.has(f));
      const allSel = selectedInFolder.length === folderFiles.length;
      const noneSel = selectedInFolder.length === 0;
      const folderTokens = folderFiles.reduce(
        (sum, f) => sum + estimateTokensForFile(f),
        0
      );
      const mark = allSel
        ? chalk.green("☑")
        : noneSel
        ? chalk.gray("☐")
        : chalk.yellow("⊟");

      choices.push({
        name:
          `${mark} 📁 ${chalk.cyan("[root]")} ` +
          chalk.gray(
            `(${selectedInFolder.length}/${
              folderFiles.length
            } files, ~${folderTokens.toLocaleString()} tok)`
          ),
        value: `__FOLDER__.`,
      });

      for (const file of folderFiles) {
        choices.push(makeFileChoice(file, checkedFiles, chalk));
      }
    }

    const renderedSubfolders = new Set();

    for (const topFolder of [...topLevelFolders].sort()) {
      const allFilesInTop = allFiles.filter((f) => {
        const rel = path.relative(projectRoot, f);
        return rel.split(path.sep)[0] === topFolder;
      });

      if (allFilesInTop.length === 0) continue;

      const selectedInTop = allFilesInTop.filter((f) => checkedFiles.has(f));
      const allSel = selectedInTop.length === allFilesInTop.length;
      const noneSel = selectedInTop.length === 0;
      const topTokens = allFilesInTop.reduce(
        (sum, f) => sum + estimateTokensForFile(f),
        0
      );
      const mark = allSel
        ? chalk.green("☑")
        : noneSel
        ? chalk.gray("☐")
        : chalk.yellow("⊟");

      choices.push({
        name:
          `${mark} 📁 ${chalk.cyan(topFolder)} ` +
          chalk.gray(
            `(${selectedInTop.length}/${
              allFilesInTop.length
            } files, ~${topTokens.toLocaleString()} tok)`
          ),
        value: `__TOPFOLDER__${topFolder}`,
      });

      const directFiles = filesByFolder[topFolder] || [];
      for (const file of directFiles) {
        choices.push(makeFileChoice(file, checkedFiles, chalk, "   "));
      }

      const subFolders = allFolderKeys.filter(
        (k) => k.startsWith(topFolder + "/") && k !== topFolder
      );

      for (const subFolder of subFolders.sort()) {
        if (renderedSubfolders.has(subFolder)) continue;
        renderedSubfolders.add(subFolder);

        const subFiles = filesByFolder[subFolder] || [];
        if (subFiles.length === 0) continue;

        const selectedInSub = subFiles.filter((f) => checkedFiles.has(f));
        const allSubSel = selectedInSub.length === subFiles.length;
        const noneSubSel = selectedInSub.length === 0;
        const subTokens = subFiles.reduce(
          (sum, f) => sum + estimateTokensForFile(f),
          0
        );
        const subMark = allSubSel
          ? chalk.green("☑")
          : noneSubSel
          ? chalk.gray("☐")
          : chalk.yellow("⊟");

        const subFolderDisplay = subFolder.split("/").slice(1).join("/");

        choices.push({
          name:
            `   ${subMark} 📂 ${chalk.cyan(subFolderDisplay)} ` +
            chalk.gray(
              `(${selectedInSub.length}/${
                subFiles.length
              } files, ~${subTokens.toLocaleString()} tok)`
            ),
          value: `__FOLDER__${subFolder}`,
        });

        for (const file of subFiles) {
          choices.push(makeFileChoice(file, checkedFiles, chalk, "      "));
        }
      }
    }

    let picked;
    try {
      picked = await select({
        message: `${t("selectFiles")}:`,
        choices,
        default: lastCursor,
        pageSize: Math.min(28, (process.stdout.rows || 30) - 4),
      });
    } catch (e) {
      throw e; // Ctrl+C должен пробросить ошибку наверх и завершить приложение
    }

    lastCursor = picked;

    if (picked === "DONE") break;
    if (picked === "BACK") return null; // ← Явный возврат «Назад»

    if (picked === "ALL_FILES") {
      checkedFiles = new Set(allFiles);
      continue;
    }

    if (picked === "CODE_ONLY") {
      const codeExt = new Set([
        ".js",
        ".jsx",
        ".ts",
        ".tsx",
        ".py",
        ".java",
        ".c",
        ".cpp",
        ".go",
        ".rs",
        ".rb",
        ".cs",
        ".php",
        ".swift",
        ".kt",
      ]);
      checkedFiles = new Set(
        allFiles.filter((f) => codeExt.has(path.extname(f).toLowerCase()))
      );
      continue;
    }

    if (typeof picked === "string" && picked.startsWith("__TOPFOLDER__")) {
      const topFolder = picked.replace("__TOPFOLDER__", "");
      const allFilesInTop = allFiles.filter((f) => {
        const rel = path.relative(projectRoot, f);
        return rel.split(path.sep)[0] === topFolder;
      });
      const allSel = allFilesInTop.every((f) => checkedFiles.has(f));
      if (allSel) {
        for (const f of allFilesInTop) checkedFiles.delete(f);
      } else {
        for (const f of allFilesInTop) checkedFiles.add(f);
      }
      continue;
    }

    if (typeof picked === "string" && picked.startsWith("__FOLDER__")) {
      const folder = picked.replace("__FOLDER__", "");
      const folderFiles =
        folder === "." ? filesByFolder["."] || [] : filesByFolder[folder] || [];
      const allSel = folderFiles.every((f) => checkedFiles.has(f));
      if (allSel) {
        for (const f of folderFiles) checkedFiles.delete(f);
      } else {
        for (const f of folderFiles) checkedFiles.add(f);
      }
      continue;
    }

    if (typeof picked === "string" && picked.startsWith("__FILE__")) {
      const file = picked.replace("__FILE__", "");
      if (checkedFiles.has(file)) {
        checkedFiles.delete(file);
      } else {
        checkedFiles.add(file);
      }
      continue;
    }
  }

  const result = [...checkedFiles].sort((a, b) =>
    path.relative(projectRoot, a).localeCompare(path.relative(projectRoot, b))
  );

  saveSelection(config, projectRoot, result);

  return result;
}

function makeFileChoice(file, checkedFiles, chalk, indent = "   ") {
  const isChecked = checkedFiles.has(file);
  const tokens = Math.ceil(
    (() => {
      try {
        return fs.statSync(file).size;
      } catch {
        return 0;
      }
    })() / 4
  );
  let size = 0;
  try {
    size = fs.statSync(file).size;
  } catch {}

  const mark = isChecked ? chalk.green("☑") : chalk.gray("☐");

  return {
    name: `${indent}${mark} ${chalk.white(path.basename(file))} ${chalk.gray(
      `(${formatSize(size)}, ~${tokens.toLocaleString()} tok)`
    )}`,
    value: `__FILE__${file}`,
  };
}

module.exports = { selectFiles };

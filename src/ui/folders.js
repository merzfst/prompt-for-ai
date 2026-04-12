const fs = require("fs");
const path = require("path");
const { select, checkbox } = require("@inquirer/prompts");
const { t } = require("../lang");
const {
  getFolderSize,
  countFilesInFolder,
  formatSize,
  defaultExcludedFolders,
} = require("../files");

async function selectFoldersToProcess(projectRoot, config, lastRun, chalk) {
  let entries = [];
  try {
    entries = fs.readdirSync(projectRoot);
  } catch {
    console.log(chalk.yellow(t("invalidPath")));
    return null;
  }

  const globalExcluded = new Set([
    ...defaultExcludedFolders,
    ...(config.globalExcludedFolders || []),
  ]);

  const folders = entries.filter((e) => {
    try {
      return (
        fs.statSync(path.join(projectRoot, e)).isDirectory() &&
        !e.startsWith(".") &&
        !globalExcluded.has(e.toLowerCase())
      );
    } catch {
      return false;
    }
  });

  if (folders.length === 0) {
    return { includedFolders: ["."], excludedFolders: [] };
  }

  if (folders.length === 1) {
    console.log(
      chalk.gray(
        `\n📁 ${t("folderAnalysis")}: ${chalk.cyan(
          folders[0]
        )} — auto selected\n`
      )
    );
    return { includedFolders: folders, excludedFolders: [] };
  }

  const foldersInfo = folders
    .map((name) => ({
      name,
      size: getFolderSize(path.join(projectRoot, name)),
      filesCount: countFilesInFolder(path.join(projectRoot, name)),
    }))
    .sort((a, b) => b.size - a.size);

  const prevExcluded = new Set(
    (lastRun?.excludedFolders || []).map((f) => f.toLowerCase())
  );

  console.log(`\n📊 ${t("folderAnalysis")}:\n${"─".repeat(65)}`);
  for (const f of foldersInfo) {
    const excluded = prevExcluded.has(f.name.toLowerCase());
    const mark = excluded ? chalk.red("✗") : chalk.green("✓");
    console.log(
      `  ${mark}  ${formatSize(f.size).padStart(9)}  │  ${String(
        f.filesCount + " files"
      ).padStart(12)}  │  ${f.name}`
    );
  }
  console.log("─".repeat(65));

  // Обычный выбор с кнопкой «Назад»
  const action = await select({
    message: t("excludeFoldersPrompt"),
    choices: [
      { name: `✅ ${t("proceedWithAll")}`, value: "proceed" },
      { name: `⚙️  ${t("selectManually")}`, value: "manual" },
      { name: `↩️  ${t("back")}`, value: "back" },
    ],
  });

  if (action === "back") return null;

  if (action === "proceed") {
    const excludedFolders = folders.filter((f) =>
      prevExcluded.has(f.toLowerCase())
    );
    return {
      includedFolders: folders.filter(
        (f) => !prevExcluded.has(f.toLowerCase())
      ),
      excludedFolders,
    };
  }

  // Ручной выбор через checkbox
  const selected = await checkbox({
    message: t("excludeFoldersPrompt"),
    instructions: chalk.gray("Space — вкл/выкл | a — всё | Enter — готово"),
    choices: foldersInfo.map((f) => ({
      name: `${f.name} ${chalk.gray(
        `(${f.filesCount} files, ${formatSize(f.size)})`
      )}`,
      value: f.name,
      checked: !prevExcluded.has(f.name.toLowerCase()),
    })),
    pageSize: 18,
  });

  if (selected.length === 0) return null;

  const excludedFolders = folders.filter((f) => !selected.includes(f));
  return { includedFolders: selected, excludedFolders };
}

module.exports = { selectFoldersToProcess };

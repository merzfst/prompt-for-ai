const fs = require("fs");
const path = require("path");
const { select, checkbox } = require("@inquirer/prompts");
const { t } = require("../lang");
const { countFilesInFolder, formatSize } = require("../files");
const { getLastRun } = require("../config");

async function selectProject(config, chalk) {
  const choices = [];

  const lastProjectPath = config.recentProjects[0];
  if (lastProjectPath && fs.existsSync(lastProjectPath)) {
    const lastRun = getLastRun(config, lastProjectPath);
    if (lastRun) {
      const lastDate = new Date(lastRun.timestamp).toLocaleDateString(
        config.lang === "ru" ? "ru-RU" : "en-US"
      );
      const validFiles = lastRun.selectedFiles.filter((f) => fs.existsSync(f));
      choices.push({
        name:
          chalk.green.bold(`⚡ ${t("repeatLast")}`) +
          chalk.gray(
            ` — ${path.basename(lastProjectPath)} · ${validFiles.length} ${t(
              "repeatLastDetails"
            )} · ${lastDate}`
          ),
        value: { type: "repeatLast", path: lastProjectPath, lastRun },
      });
      choices.push({
        name: "─────────────────────────────",
        value: null,
        disabled: true,
      });
    }
  }

  const validFavs = config.favorites.filter(
    (p) => fs.existsSync(p) && fs.statSync(p).isDirectory()
  );
  if (validFavs.length > 0) {
    choices.push({
      name: chalk.yellow(`─── ⭐ ${t("favorites")} ───`),
      value: null,
      disabled: true,
    });
    for (const fav of validFavs) {
      choices.push({
        name: `⭐ ${path.basename(fav)} ${chalk.gray(
          `(${countFilesInFolder(fav)} files) — ${fav}`
        )}`,
        value: { type: "project", path: fav },
      });
    }
  }

  const validRecent = config.recentProjects
    .filter(
      (p) =>
        fs.existsSync(p) &&
        fs.statSync(p).isDirectory() &&
        !config.favorites.includes(p)
    )
    .slice(0, 6);

  if (validRecent.length > 0) {
    choices.push({
      name: chalk.gray(`─── 🕐 ${t("recent")} ───`),
      value: null,
      disabled: true,
    });
    for (const recent of validRecent) {
      choices.push({
        name: `   ${path.basename(recent)} ${chalk.gray(
          `(${countFilesInFolder(recent)} files) — ${recent}`
        )}`,
        value: { type: "project", path: recent },
      });
    }
  }

  choices.push({
    name: chalk.gray("─────────────────────────────"),
    value: null,
    disabled: true,
  });
  choices.push({ name: `📂 ${t("browseFolder")}`, value: { type: "browse" } });
  choices.push({
    name: `✏️  ${t("enterPathManually")}`,
    value: { type: "manual" },
  });
  if (validFavs.length > 0)
    choices.push({
      name: `🗑️  ${t("manageFavorites")}`,
      value: { type: "manageFavorites" },
    });
  choices.push({ name: `⚙️  ${t("settings")}`, value: { type: "settings" } });
  choices.push({ name: `🚪 ${t("exit")}`, value: { type: "exit" } });

  return await select({
    message: t("selectProject"),
    choices,
    pageSize: 18,
  });
}

async function manageFavorites(config, chalk) {
  if (config.favorites.length === 0) {
    console.log(chalk.gray(t("noFavorites")));
    return;
  }
  const toRemove = await checkbox({
    message: t("selectToRemove"),
    choices: config.favorites.map((f) => ({
      name: `⭐ ${path.basename(f)} — ${f}`,
      value: f,
    })),
  });
  if (toRemove.length > 0) {
    config.favorites = config.favorites.filter((f) => !toRemove.includes(f));
    console.log(chalk.green(t("favoritesUpdated")));
  }
}

module.exports = { selectProject, manageFavorites };

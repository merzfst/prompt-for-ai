const { select, input, checkbox, confirm } = require("@inquirer/prompts");
const { t, setLang } = require("../lang");
const { loadConfig, saveConfig } = require("../config");
const { defaultExcludedFolders } = require("../files");

async function openSettings(config, chalk) {
  while (true) {
    console.log(`\n${chalk.cyan.bold(t("settingsTitle"))}\n`);

    const action = await select({
      message: t("settingsTitle"),
      choices: [
        {
          name: `🌐 ${t("settingsLang")}: ${chalk.yellow(
            config.lang === "ru" ? "Русский" : "English"
          )}`,
          value: "lang",
        },
        {
          name: `📤 ${t("settingsExportFormat")}: ${chalk.yellow(
            config.exportFormat === "pdf" ? "PDF" : "TXT"
          )}`,
          value: "exportFormat",
        },
        {
          name: `⚠️  ${t("settingsTokenLimit")}: ${chalk.yellow(
            config.tokenLimit > 0
              ? `${config.tokenLimit.toLocaleString()} ${t("estimatedTokens")}`
              : t("tokenUnlimited")
          )}`,
          value: "tokenLimit",
        },
        {
          name: `🚫 ${t("settingsGlobalExcludeFolders")} (${chalk.yellow(
            config.globalExcludedFolders.length
          )} custom)`,
          value: "excludeFolders",
        },
        {
          name: `📝 ${t("settingsExcludePatterns")} (${chalk.yellow(
            config.excludePatterns.length
          )})`,
          value: "excludePatterns",
        },
        {
          name: `🗑️  ${t("settingsClearHistory")}`,
          value: "clearHistory",
        },
        {
          name: `${t("settingsBack")}`,
          value: "back",
        },
      ],
      pageSize: 10,
    });

    if (action === "back") break;

    if (action === "lang") {
      const newLang = await select({
        message: t("settingsLang"),
        choices: [
          { name: "Русский", value: "ru" },
          { name: "English", value: "en" },
        ],
        default: config.lang,
      });
      config.lang = newLang;
      setLang(newLang);
      saveConfig(config);
      console.log(chalk.green(t("settingsSaved")));
    } else if (action === "exportFormat") {
      config.exportFormat = await select({
        message: t("settingsExportFormat"),
        choices: [
          { name: t("exportTxt"), value: "txt" },
          { name: t("exportPdf"), value: "pdf" },
        ],
        default: config.exportFormat,
      });
      saveConfig(config);
      console.log(chalk.green(t("settingsSaved")));
    } else if (action === "tokenLimit") {
      const raw = await input({
        message: t("settingsTokenLimitPrompt"),
        default: String(config.tokenLimit || 0),
        validate: (v) =>
          (!isNaN(Number(v)) && Number(v) >= 0) || "Введите число >= 0",
      });
      config.tokenLimit = Number(raw);
      saveConfig(config);
      console.log(chalk.green(t("settingsSaved")));
    } else if (action === "excludeFolders") {
      await manageFolderExclusions(config, chalk);
    } else if (action === "excludePatterns") {
      await manageExcludePatterns(config, chalk);
    } else if (action === "clearHistory") {
      const sure = await confirm({
        message: t("settingsClearHistoryConfirm"),
        default: false,
      });
      if (sure) {
        config.recentProjects = [];
        config.projectSettings = {};
        saveConfig(config);
        console.log(chalk.green(t("settingsHistoryCleared")));
      }
    }
  }
}

async function manageFolderExclusions(config, chalk) {
  const builtIn = [...defaultExcludedFolders].sort();

  while (true) {
    const action = await select({
      message: t("settingsGlobalExcludeFolders"),
      choices: [
        { name: `➕ ${t("settingsAddFolder")}`, value: "add" },
        ...(config.globalExcludedFolders.length > 0
          ? [{ name: `➖ ${t("settingsRemoveFolder")}`, value: "remove" }]
          : []),
        {
          name: `📋 Встроенные исключения: ${chalk.gray(
            builtIn.slice(0, 5).join(", ") + (builtIn.length > 5 ? "..." : "")
          )}`,
          value: null,
          disabled: true,
        },
        ...(config.globalExcludedFolders.length > 0
          ? [
              {
                name: `📋 Кастомные: ${chalk.yellow(
                  config.globalExcludedFolders.join(", ")
                )}`,
                value: null,
                disabled: true,
              },
            ]
          : []),
        { name: t("settingsBack"), value: "back" },
      ],
    });

    if (action === "back" || !action) break;

    if (action === "add") {
      const folder = await input({
        message: t("settingsEnterFolder"),
        validate: (v) => v.trim().length > 0 || "Нельзя пустое",
      });
      const trimmed = folder.trim().toLowerCase();
      if (!config.globalExcludedFolders.includes(trimmed)) {
        config.globalExcludedFolders.push(trimmed);
        saveConfig(config);
        console.log(chalk.green(t("settingsSaved")));
      }
    }

    if (action === "remove") {
      const toRemove = await checkbox({
        message: t("settingsSelectToRemove"),
        choices: config.globalExcludedFolders.map((f) => ({
          name: f,
          value: f,
        })),
      });
      config.globalExcludedFolders = config.globalExcludedFolders.filter(
        (f) => !toRemove.includes(f)
      );
      saveConfig(config);
      console.log(chalk.green(t("settingsSaved")));
    }
  }
}

async function manageExcludePatterns(config, chalk) {
  while (true) {
    const action = await select({
      message: t("settingsExcludePatterns"),
      choices: [
        { name: `➕ ${t("settingsAddPattern")}`, value: "add" },
        ...(config.excludePatterns.length > 0
          ? [{ name: `➖ ${t("settingsRemovePattern")}`, value: "remove" }]
          : []),
        {
          name: `📋 ${chalk.yellow(config.excludePatterns.join(", ") || "—")}`,
          value: null,
          disabled: true,
        },
        { name: t("settingsBack"), value: "back" },
      ],
    });

    if (action === "back" || !action) break;

    if (action === "add") {
      const pattern = await input({
        message: t("settingsEnterPattern"),
        validate: (v) => v.trim().length > 0 || "Нельзя пустое",
      });
      const trimmed = pattern.trim();
      if (!config.excludePatterns.includes(trimmed)) {
        config.excludePatterns.push(trimmed);
        saveConfig(config);
        console.log(chalk.green(t("settingsSaved")));
      }
    }

    if (action === "remove") {
      const toRemove = await checkbox({
        message: t("settingsSelectToRemove"),
        choices: config.excludePatterns.map((p) => ({ name: p, value: p })),
      });
      config.excludePatterns = config.excludePatterns.filter(
        (p) => !toRemove.includes(p)
      );
      saveConfig(config);
      console.log(chalk.green(t("settingsSaved")));
    }
  }
}

module.exports = { openSettings };

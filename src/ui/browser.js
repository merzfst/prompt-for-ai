const fs = require("fs");
const path = require("path");
const { search } = require("@inquirer/prompts");
const { getFolderSize, countFilesInFolder, formatSize } = require("../files");
const { t } = require("../lang");

async function promptPath(defaultPath) {
  let currentPath = path.resolve(defaultPath);

  while (true) {
    let entries = [];
    try {
      entries = fs.readdirSync(currentPath);
    } catch {
      const parent = path.dirname(currentPath);
      if (parent === currentPath) return null;
      currentPath = parent;
      continue;
    }

    const dirs = entries
      .filter((e) => {
        try {
          return (
            fs.statSync(path.join(currentPath, e)).isDirectory() &&
            !e.startsWith(".")
          );
        } catch {
          return false;
        }
      })
      .map((dir) => {
        const full = path.join(currentPath, dir);
        return {
          name: dir,
          size: getFolderSize(full),
          filesCount: countFilesInFolder(full),
          fullPath: full,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const choices = [
      {
        name: `✅ ${t("selectThisFolder")} [${path.basename(currentPath)}]`,
        value: "select",
      },
      { name: `⬆️  ${t("back")}`, value: ".." },
      { name: "───────────────", value: null, disabled: true },
      ...dirs.map((d) => ({
        name: `📁 ${d.name} (${d.filesCount} files, ${formatSize(d.size)})`,
        value: d.name,
      })),
    ];

    try {
      const choice = await search({
        message: `📍 ${currentPath}`,
        source: async (input) =>
          !input
            ? choices
            : choices.filter(
                (c) =>
                  c.name && c.name.toLowerCase().includes(input.toLowerCase())
              ),
      });

      if (choice === "select") return currentPath;
      else if (choice === "..") currentPath = path.dirname(currentPath);
      else if (choice) currentPath = path.join(currentPath, choice);
    } catch {
      return null;
    }
  }
}

module.exports = { promptPath };

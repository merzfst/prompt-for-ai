const fs = require("fs");
const path = require("path");

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
  ".swift",
  ".kt",
  ".kts",
  ".scala",
  ".rs",
  ".lua",
  ".pl",
  ".r",
  ".R",
  ".jl",
  ".ex",
  ".exs",
  ".erl",
  ".clj",
  ".cljs",
  ".fs",
  ".dart",
  ".m",
  ".groovy",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".vue",
  ".svelte",
  ".json",
  ".jsonc",
  ".xml",
  ".yml",
  ".yaml",
  ".toml",
  ".ini",
  ".cfg",
  ".env",
  ".sql",
  ".graphql",
  ".gql",
  ".proto",
  ".md",
  ".markdown",
  ".txt",
  ".rst",
  ".dockerfile",
  ".gitignore",
  ".editorconfig",
]);

const allowedFilenames = new Set([
  "makefile",
  "dockerfile",
  "cmakelists.txt",
  "gemfile",
  "rakefile",
  "requirements.txt",
  "pipfile",
  ".gitignore",
  ".editorconfig",
  "license",
  "readme",
  "changelog",
  "docker-compose.yml",
  "docker-compose.yaml",
  "tsconfig.json",
  "jsconfig.json",
  "package.json",
  "vite.config.js",
  "vite.config.ts",
  "webpack.config.js",
  "next.config.js",
  "tailwind.config.js",
]);

const defaultExcludedFolders = new Set([
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
  "coverage",
  ".nyc_output",
  ".cache",
  ".parcel-cache",
  "vendor",
  "packages",
  ".next",
  ".nuxt",
]);

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function isAllowed(entry) {
  const ext = path.extname(entry).toLowerCase();
  const lower = entry.toLowerCase();
  return allowedExtensions.has(ext) || allowedFilenames.has(lower);
}

function getFolderSize(folderPath, extraExcluded = new Set()) {
  let size = 0;
  try {
    for (const entry of fs.readdirSync(folderPath)) {
      const full = path.join(folderPath, entry);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          if (
            !defaultExcludedFolders.has(entry.toLowerCase()) &&
            !extraExcluded.has(entry.toLowerCase())
          )
            size += getFolderSize(full, extraExcluded);
        } else {
          size += stat.size;
        }
      } catch {}
    }
  } catch {}
  return size;
}

function countFilesInFolder(folderPath, extraExcluded = new Set()) {
  let count = 0;
  try {
    for (const entry of fs.readdirSync(folderPath)) {
      const full = path.join(folderPath, entry);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          if (
            !defaultExcludedFolders.has(entry.toLowerCase()) &&
            !extraExcluded.has(entry.toLowerCase())
          )
            count += countFilesInFolder(full, extraExcluded);
        } else {
          if (isAllowed(entry)) count++;
        }
      } catch {}
    }
  } catch {}
  return count;
}

function getAllFiles(dir, options = {}) {
  const {
    excludedFolders = defaultExcludedFolders,
    customExcludedFolders = [],
    excludePatterns = [],
    maxDepth = 10,
    currentDepth = 0,
  } = options;

  const files = [];
  if (currentDepth > maxDepth) return files;

  const allExcluded = new Set([
    ...excludedFolders,
    ...customExcludedFolders.map((f) => f.toLowerCase()),
  ]);

  try {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          if (!allExcluded.has(entry.toLowerCase()) && !entry.startsWith("."))
            files.push(
              ...getAllFiles(full, {
                ...options,
                currentDepth: currentDepth + 1,
              })
            );
        } else {
          if (!isAllowed(entry)) continue;
          const shouldExclude = excludePatterns.some((p) =>
            p.startsWith("*")
              ? entry.endsWith(p.slice(1))
              : entry === p || entry.includes(p)
          );
          if (!shouldExclude) files.push(full);
        }
      } catch {}
    }
  } catch {}
  return files;
}

function generateTree(root, files) {
  const tree = {};
  for (const file of files) {
    const parts = path.relative(root, file).split(path.sep);
    let node = tree;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) node[part] = file;
      else {
        node[part] = node[part] || {};
        node = node[part];
      }
    });
  }
  return tree;
}

function treeToString(tree, indent = "") {
  let str = "";
  const keys = Object.keys(tree).sort((a, b) => {
    const aDir = typeof tree[a] === "object";
    const bDir = typeof tree[b] === "object";
    if (aDir && !bDir) return -1;
    if (!aDir && bDir) return 1;
    return a.localeCompare(b);
  });
  for (const key of keys) {
    if (typeof tree[key] === "string") str += `${indent}- ${key}\n`;
    else {
      str += `${indent}+ ${key}\n`;
      str += treeToString(tree[key], indent + "  ");
    }
  }
  return str;
}

module.exports = {
  allowedExtensions,
  allowedFilenames,
  defaultExcludedFolders,
  formatSize,
  isAllowed,
  getFolderSize,
  countFilesInFolder,
  getAllFiles,
  generateTree,
  treeToString,
};

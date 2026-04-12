const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

function updateGitignore(projectRoot) {
  const gitignorePath = path.join(projectRoot, ".gitignore");
  const entries = ["prompt.txt", "prompt.pdf"];
  let content = "";

  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, "utf8");
  }

  const missing = entries.filter((e) => {
    return !content.split("\n").some((line) => line.trim() === e);
  });

  if (missing.length === 0) return false;
  const addition = "\n# prompt-for-ai\n" + missing.join("\n") + "\n";
  fs.appendFileSync(gitignorePath, addition, "utf8");
  return true;
}

function generateCompressedPDF(promptContent, outputPath) {
  return new Promise((resolve, reject) => {
    const minified = promptContent
      .replace(/\r\n/g, "\n")
      .replace(/\n\s*\n/g, "\n")
      .replace(/^[ \t]+/gm, (m) =>
        " ".repeat(Math.max(1, Math.floor(m.length / 4)))
      );

    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 10, bottom: 10, left: 10, right: 10 },
      autoFirstPage: true,
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    doc
      .font("Courier")
      .fontSize(6)
      .text(minified, { lineGap: -1, align: "left" });
    doc.end();

    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

async function exportPrompt(promptContent, projectRoot, format) {
  const gitignoreUpdated = updateGitignore(projectRoot);

  let savedPath = "";
  if (format === "pdf") {
    savedPath = path.join(projectRoot, "prompt.pdf");
    await generateCompressedPDF(promptContent, savedPath);
  } else {
    savedPath = path.join(projectRoot, "prompt.txt");
    fs.writeFileSync(savedPath, promptContent, "utf8");
  }

  return { savedPath, gitignoreUpdated };
}

module.exports = { exportPrompt, updateGitignore };

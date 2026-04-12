const path = require("path");
const messages = require("../lang.json");

let lang = "ru";

function setLang(l) {
  lang = l;
}

function getLang() {
  return lang;
}

function t(key) {
  return (
    (messages[lang] && messages[lang][key]) ||
    (messages["en"] && messages["en"][key]) ||
    key
  );
}

module.exports = { setLang, getLang, t };

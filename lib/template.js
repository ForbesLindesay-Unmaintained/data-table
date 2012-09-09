var escape = require('escape-html');

module.exports = template;
function template(string, object) {
  return string.replace(/\{\{(\{?\w+\}?)\}\}/g, function (_, name) {
    var unescaped = /\{(\w+)\}/.exec(name);
    if (unescaped) {
      return object[unescaped[1]];
    } else {
      return escape(object[name]);
    }
  });
}
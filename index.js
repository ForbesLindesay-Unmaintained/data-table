var emitter = require('emitter');

module.exports = table;


function table(table) {
  if (typeof table !== 'object') throw new Error('To use table, you must pass an element of type "<table>"');
  if (table.tagName !== 'TABLE') throw new Error('To use table, the table must be of type "<table>"');
  var headers = table
    .getElementsByTagName('thead')[0]
    .getElementsByTagName('tr')[0]
    .getElementsByTagName('th');

  var scripts = getScripts(table);

  function getColumn(column) {
    var header;
    if (typeof column === 'number') {
      header = headers[column];
    } else if (typeof column === 'string') {
      for (var i = 0; i < headers.length && !header; i++) {
        if (headers[i].getAttribute('data-name') === column) {
          header = headers[i];
        }
      }
    }
    if (!header) throw new Error('Column not found');

    var result = function (name, value) {
      return dataAttribute(header, name, value);
    };
    result.innerHTML = header.innerHTML;
    result.headerElement = header;
    return result;
  }

  var result = emitter({getColumn: getColumn});

  var rows = {};
  

  return emitter;
}

function getScripts(table) {
  var result = {};
  var scripts = table
    .getElementsByTagName('tbody')[0]
    .getElementsByTagName('script');

  for (var i = 0; i < scripts.length; i++) {
    result[scripts[i].getAttribute('type').replace('application/', '')] = scripts[i].innerHTML;
  }

  table.getElementsByTagName('tbody')[0].innerHTML = '';

  return result;
}

function dataAttribute(element, name, value) {
  name = 'data-' + name.replace(/([A-Z])/g, function (_, l) {
    return '-' + l.toLowerCase();
  });
  if (typeof value === 'undefined') {
    return element.getAttribute(name);
  } else {
    element.setAttribute(name, value);
  }
}
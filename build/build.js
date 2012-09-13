/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(p, parent, orig){
  var path = require.resolve(p)
    , mod = require.modules[path];

  // lookup failed
  if (null == path) {
    orig = orig || p;
    parent = parent || 'root';
    throw new Error('failed to require "' + orig + '" from "' + parent + '"');
  }

  // perform real require()
  // by invoking the module's
  // registered function
  if (!mod.exports) {
    mod.exports = {};
    mod.client = mod.component = true;
    mod.call(mod.exports, mod, mod.exports, require.relative(path));
  }

  return mod.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path){
  var orig = path
    , reg = path + '.js'
    , regJSON = path + '.json'
    , index = path + '/index.js'
    , indexJSON = path + '/index.json';

  return require.modules[reg] && reg
    || require.modules[regJSON] && regJSON
    || require.modules[index] && index
    || require.modules[indexJSON] && indexJSON
    || require.modules[orig] && orig
    || null;
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  // foo
  if ('.' != path[0]) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `fn`.
 *
 * @param {String} path
 * @param {Function} fn
 * @api private
 */

require.register = function(path, fn){
  require.modules[path] = fn;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to){
  var fn = require.modules[from];
  if (!fn) throw new Error('failed to alias "' + from + '", it does not exist');
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * The relative require() itself.
   */

  function fn(path){
    var orig = path;
    path = fn.resolve(path);
    var alias = require.aliases[path + '/index.js'];
    if (alias) path = alias;
    return require(path, parent, orig);
  }

  /**
   * Resolve relative to the parent.
   */

  fn.resolve = function(path){
    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    if ('.' != path[0]) {
      var segs = parent.split('/');
      var i = segs.lastIndexOf('deps') + 1;
      if (!i) i = 0;
      path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
      return path;
    }
    return require.normalize(p, path);
  };

  /**
   * Check if module is defined at `path`.
   */

  fn.exists = function(path){
    return !! require.modules[fn.resolve(path)];
  };

  return fn;
};require.register("ForbesLindesay-data-table/index.js", function(module, exports, require){
module.exports = table;

function table(table) {
  if (typeof table !== 'object') throw new Error('To use table, you must pass an element of type "<table>"');
  if (table.tagName !== 'TABLE') throw new Error('To use table, the table must be of type "<table>"');

  var exports = {};

  var templates = exports.templates = getTemplates(table);
  var columns = exports.columns = getColumns(table);

  var dataSource;
  var rowRenderer;

  var plugins = [];

  exports.use = use;
  function use(plugin) {
    if (dataSource) plugin(exports, templates, columns, dataSource);
    else plugins.push(plugin);
  }

  exports.renderer = renderer;
  function renderer(renderer) {
    if (!renderer) throw new Error('RowRenderer can\'t be null');
    if (rowRenderer) throw new Error('You can\'t set the RowRenderer multiple times');
    rowRenderer = renderer;
    render();
  }

  exports.source = source;
  function source(dSource) {
    if (!dSource) throw new Error('DataSource can\'t be null');
    if (dataSource) throw new Error('You can\'t set the DataSource multiple times');
    dataSource = dSource;
    dataSource.getID = dataSource.getID || function (record) { return record.id; };
    render();
  }

  function render() {
    if (!dataSource || !rowRenderer) return;
    for (var i = 0; i < plugins.length; i++) {
      plugins[i](exports, templates, columns, dataSource);
    }
    plugins = null; //prevent memory leak
    update(); //todo: provide a callback
  }

  var elementCache = {};
  var nextElementCache = {};
  exports.update = update;
  function update(callback) {
    var options = {};
    nextElementCache = {};
    //todo: trigger events then update ui, then trigger more events
    trigger('pre-load', [options], function (err) {
      if (err) return callback(err);
      dataSource.getRows(options, function (err, records, hasMore) {
        if (err) return callback(err);
        trigger('post-load', [options, records, hasMore], function (err) {
          if (err) return callback(err);
          var i = -1;
          function next(err) {
            if (err) return callback(err);
            if ((++i) + 1 > records.length) return after();

            add(records, i, next);
          }
          next();

          function after() {
            elementCache = nextElementCache;
          }
        });
      });
    });
  }

  function add(records, i, callback) {
    var record = records[i];
    var id = dataSource.getID(record);
    if (nextElementCache[id]) return callback(new Error('The same id can\'t appear twice in the table'));
    trigger('pre-render', [record, id, records, i], function (err) {
      if (err) return callback(err);
      rowRenderer(record, records, i, id, function (err, result) {
        if (err) return callback(err);
        trigger('post-render', [record, id, records, i, result], function (err) {
          if (err) return callback(err);
          addRow(table, result);
          callback();
        })
      });
    });
  }

  var events = {};
  function trigger(name, args, callback) {
    var handlers = events[name];
    if (!handlers) return callback();
    var i = 0;
    function next(err) {
      if (err) return callback(err);
      else if (++i >= handlers.length) return callback();
      handlers[i].apply(null, args.concat(next));
    }
    next();
  }
  exports.register = register;
  function register(name, handler) {
    events[name].push(handler);
  }
  return exports;
}


function getTemplates(table) {
  var result = {};
  var scripts = table
    .getElementsByTagName('tbody')[0]
    .getElementsByTagName('script');

  for (var i = 0; i < scripts.length; i++) {
    result[scripts[i].getAttribute('type').replace('application/', '').replace(/\-(\w)/g, function (_, char) { return char.toUpperCase(); })] = scripts[i].innerHTML;
  }

  table.getElementsByTagName('tbody')[0].innerHTML = '';

  return result;
}

function getColumns(table) {
  var headers = table
    .getElementsByTagName('thead')[0]
    .getElementsByTagName('tr')[0]
    .getElementsByTagName('th');
  var results = [];
  for (var i = 0; i < headers.length; i++) {
    var result = dataAttribute(headers[i]);
    result.innerHTML = headers[i].innerHTML;
    result.headerElement = headers[i];
    results.push(result);
  }
  return results;

}
function dataAttribute(element){
  return function dataAttribute(name, value) {
    name = 'data-' + name.replace(/([A-Z])/g, function (_, l) {
      return '-' + l.toLowerCase();
    });
    if (typeof value === 'undefined') {
      return element.getAttribute(name);
    } else {
      element.setAttribute(name, value);
    }
  };
}

function addRow(table, element) {
  table.getElementsByTagName('tbody')[0].appendChild(element);
}
});
require.alias("ForbesLindesay-data-table/index.js", "data-table-app/deps/data-table/index.js");

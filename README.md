data-table
==========

**!!!WARNING!!! Draft Spec: Implimentation in progress**

Functionality for manipulating cells of a table, with appropriate markup, completely dependency free.

Creating a Data Table
---------------------

A data table consists of:

 - A Row Template
 - A Data Source
 - Plugins

A typical configuration would look like:

```html
<table id="users">
  <thead>
    <th data-name="username">Username</th>
    <th data-name="name">Real Name</th>
  </thead>
  <tbody>
    <script type="application/row-template">
      <tr><td>{{username}}</td><td>{{name}}</td></tr>
    </script>
    <script type="application/json-data">
      [
        {username: "ForbesLindesay", name: "Forbes Lindesay"},
        {username: "substack", name: "James Halliday"},
        {username: "visionmedia", name: "TJ Holowaychuk"}
      ]
    </script>
  </tbody>
</table>
```

```JavaScript
//Load the module
var dataTable = require('data-table');

//Create a new dataTable from the element
var table = dataTable(document.getElementById('users'));

//Use some plugins in their default configuration
table.use(require('sorting'));
table.use(require('paging'));
table.use(require('search'));

//Define the source
var jsonSource = require('json-source');
//jsonSource will automatically load the json in script - "application/json-data"
var source = jsonSource(table);
source.getID = function (record) {
  return record.username; //If our id was called id we wouldn't need this
};

//Use the source
table.source(source);
```

Setting the table source at the end is important, since that ensures that all plugins get to act on the table when it's first rendered.  If you added source before the plugins, all rows would be fetched and rendered, even though we use the paging plugin.  We'd then use the paging plugin and have to remove some of the rows we already rendered.  This could potentially have an enormous performance cost.

Row Template
------------

The row template uses a markdown like syntax to produce the row.

Example:

```html
<tr><td>{{id}}</td><td>{{date}}</td><td>{{{richText}}}</td></tr>
```

In that example, id and date would be escaped, while richText would be outputted as-is.  It is recomended that you escape everything unless it's from a trusted source.

Data Source API
---------------

You probably want to use one of the pre-made plugins for this, but if you want to impliment your own, here's how:

The data source provides the data to render in the table.  It must supply a set of rows, and a selector for the id.

### DataSource#getID(record)

returns the id of a record. If a source doesn't provide an implimentation of this method, the following default will be used:

```javascript
function getID(record) {
  return record.id;
}
```

The id must be a primitive type such as an int or a string.  Each record must have a unique id.

### DataSource#count(callback(err, count))

Call callback with the number of rows in the table.  If the number of rows is un-known, it should return -1.

### DataSource#getRows(options, callback)

#### options

Options contains any options for filtering, paging and sorting.  There are therefore 3 properties of options such that it looks like: {filter, page, sort}

All 3 options are, suprise, suprise, optional.  A source can also throw an exception (syncronously) for any values that it doesn't support on these options.

Technically the options **can** be set to anything (to allow for complete extensibility), but in general they **should** be as follows, and all the plugins made by me will adhere to these standards.

##### options.filter

A filter of type **string** represents a search term to filter by.  Sometimes this may be set to an object with the signature `{fieldA: 'foo', fieldB: 'bar'}` which means to search for records with fieldA set to 'foo' and fieldB set to 'bar'.  An array of such objects would then represent or'ing together of conditions/filters.

##### options.page

Will be null if there is no paging enabled.  Otherwise it should be of the form: `{startIndex, count}`.  A start index of `0` must always fetch the first page.  If the callback returns an object (instead of `true` or `false`) for `hasMore`, this **should** be used to fetch the next page, instead of numbers, so it is not essential to support `skip` as part of your query (I'm thinking of azure table storage there).

##### options.sort

By default, you should sort on id, which _may_ not be displayed.  Otherwise sort will be `{field: 'name', order: 'ascending'}` or `{field: 'name', order: 'descending'}`.

#### callback(err, records, hasMore)
Retrieves a (sub)set of results.  To support async operation, node.js style callbacks are used.  You should call the callback with an array of records and a boolean value to represent whether there are more.  The first argument should be null unless there was an error, in which case it should be equal to that error.

### DataSource#update(id, name, value, callback(err))

If a data source supports writing, it should provide this (optional) method to update the source.

Plugin API
----------

Plugins should simply be functions that take a dataTable, the templates object and the dataSource as arguments.  They can then subscribe to lots of events on the table object.

For example, if we wanted to display one of the rows at random, we could do this:

```JavaScript

function randomPlugin(table, templates, source) {
  table.register('pre-render', function (options, done) {
    source.count(function (err, count) {
      if (err) throw err;
      options.page = { start: Math.floor(Math.random() * count), count: 1};
      done();
    });
  });
}

```
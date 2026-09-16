const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/tableExport.ts'), 'utf8');
const scope = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, scope);
const { serializeTable, sortTableRows } = scope.exports;
const rows = [{ name: 'Paalstraat 12', nr: '000012' }, { name: 'Paalstraat 2', nr: '000002' }];
const sorted = sortTableRows(rows, r => r.name, 'en', false);
assert.equal(sorted[0].nr, '000002');
assert.equal(rows[0].nr, '000012', 'sorting must not mutate incoming results');
assert.equal(sortTableRows(rows, r => r.name, 'en', true)[0].nr, '000012');
const matrix = sorted.map(r => [r.name, r.nr]);
const csv = serializeTable(['Address', 'Number'], matrix, ',');
const tsv = serializeTable(['Address', 'Number'], matrix, '\t');
assert.equal(csv, '"Address","Number"\r\n"Paalstraat 2","000002"\r\n"Paalstraat 12","000012"');
assert.equal(tsv, 'Address\tNumber\r\nPaalstraat 2\t000002\r\nPaalstraat 12\t000012');
assert.equal(serializeTable(['Name'], [['A "quote", café']], ','), '"Name"\r\n"A ""quote"", café"');
assert.equal(serializeTable(['Name'], [['=1+1'], [' @SUM(1)']], ','), '"Name"\r\n"\'=1+1"\r\n"\' @SUM(1)"');
assert.equal(serializeTable(['Name'], [['Line\nbreak\tvalue']], '\t'), 'Name\r\nLine break value');
console.log('PASS: numeric sorting, source immutability, same export/copy order, Unicode, leading zeros, escaping and formula protection.');

const selectionSource = fs.readFileSync(path.join(__dirname, '../src/exportSelection.ts'), 'utf8');
const selectionScope = { exports: {} };
vm.runInNewContext(ts.transpileModule(selectionSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, selectionScope);
const select = selectionScope.exports.selectExport;
const contacts = {
  one: [{kind:'email', value:'Shop@Example.org'}, {kind:'phone', value:'03 664 93 04'}],
  two: [{kind:'email', value:'shop@example.org'}, {kind:'email', value:'Office@example.org'}, {kind:'phone', value:'+32 3 664 93 04'}],
  outside: [{kind:'email', value:'outside@example.org'}],
};
const labels = { email:'Email', phone:'Phone', website:'Website' };
const emails = select(['Name'], [['Two'], ['One']], ['two','one'], 'emails', [], contacts, labels);
assert.equal(JSON.stringify(emails.rows), JSON.stringify([['shop@example.org'],['Office@example.org']]));
const phones = select(['Name'], [['One'],['Two']], ['one','two'], 'phones', [], contacts, labels);
assert.equal(JSON.stringify(phones.rows), JSON.stringify([['03 664 93 04']]));
const custom = select(['Name'], [['Two'], ['One']], ['two','one'], 'custom', ['0','email'], contacts, labels);
assert.equal(JSON.stringify(custom.headers), JSON.stringify(['Name','Email']));
assert.equal(custom.rows[0][0], 'Two');
assert.equal(custom.rows[1][1], 'Shop@Example.org');
assert.equal(select(['Name'], [['One']], ['missing'], 'emails', [], contacts, labels).rows.length, 0);
console.log('PASS: custom columns, contact deduplication, selected record scope and unchanged source order.');

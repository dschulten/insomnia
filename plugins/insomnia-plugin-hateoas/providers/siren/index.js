const fs = require('fs');
const path = require('path');
const jq = require('jsonpath');
const peg = require('pegjs');
const newRequest = require('../new-request');

module.exports.affordanceProviders = [
  (context, body) => {
    const contentType = context.response.getHeader('Content-Type');
    if (contentType !== 'application/vnd.siren+json') {
      return {};
    }
    const sirenGrammar = fs.readFileSync(path.join(__dirname, '/siren.pegjs')).toString();
    const parser = peg.generate(sirenGrammar);
    const bodyJsonWithHrefLocations = parser.parse(body);
    const actions = jq.query(bodyJsonWithHrefLocations, '$..actions');
    const affordances = {};

    actions
      .reduce((acc, arr) => acc.concat(arr), [])
      .forEach(action => {
        let type = action.type;
        let bodyText = '';
        if (action.fields) {
          if (type === 'application/json') {
            const body = {};
            action.fields.forEach(field => {
              let value = field.value;
              if (value) {
                if (field.type === 'number') {
                  value = Number(value);
                }
              } else {
                if (field.type === 'number') {
                  value = 0;
                } else {
                  value = '';
                }
              }
              body[field.name] = value;
            });
            bodyText = JSON.stringify(body);
          } else {
            type = 'application/x-www-form-urlencoded';
            bodyText = action.fields
              .map(field => field.name + (field.value ? '=' + encodeURI(field.value) : ''))
              .join('&');
          }
        }
        // TODO build a followup request which overlays the current request, not all req fields are needed,
        //   instead describe form-urlencoded fields for editing, define editor mode etc.
        const request = newRequest(action.href.href, action.method, bodyText, [
          {
            name: 'Content-Type',
            value: type,
          },
        ]);

        const line = action.href.location.start.line - 1;
        const affordancesInLine = affordances[line] || [];
        affordancesInLine.push({
          startColumn: action.href.location.start.column,
          endColumn: action.href.location.end.column,
          request,
        });
        affordances[line] = affordancesInLine;
      });
    return affordances;
  },
];

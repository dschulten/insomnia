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
        let body;
        let parameters;
        let fileName;
        if (action.fields) {
          if (type === 'application/json') {
            body = { type };
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
            body.text = JSON.stringify(body);
          } else {
            type = 'application/x-www-form-urlencoded';
            // TODO make pair name readonly
            const fieldDescriptors = [];
            const fields = action.fields;
            for (let i = 0; i < fields.length; i++) {
              const field = fields[i];
              const options = [];
              let value = field.multiple ? [] : undefined;
              if (Array.isArray(field.value)) {
                for (let j = 0; j < field.value.length; j++) {
                  const optionValue = field.value[j];
                  options.push({
                    name: optionValue.title || optionValue.value,
                    value: optionValue.value,
                  });
                  if (optionValue.selected) {
                    if (field.multiple) {
                      value.push(optionValue.value);
                    } else {
                      value = optionValue.value;
                    }
                  }
                }
                fieldDescriptors.push({
                  name: field.name,
                  type: 'select',
                  value,
                  multiple: field.type === 'checkbox',
                  options,
                });
              } else {
                fieldDescriptors.push(field);
              }
            }
            if (action.method === 'GET') {
              body = {};
              parameters = fieldDescriptors;
            } else {
              body = { mimeType: type };
              body.params = fieldDescriptors;
            }
          }
        }
        // TODO add mediatype from plugin to acceptable types
        //   better uritemplate flowtyped
        //   support file type and other types, (pair.type.file, pair.multiline in one-line-editor)
        //   url in address bar when built with params
        //   show rfm for query params (improve later with selected - or disable/enable?)
        //  a
        const request = newRequest(action.href.href, action.method, parameters, body, [
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

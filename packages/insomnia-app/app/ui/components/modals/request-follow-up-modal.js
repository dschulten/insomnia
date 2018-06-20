// @flow
import React, { PureComponent } from 'react';
import autobind from 'autobind-decorator';
import MethodDropdown from '../dropdowns/method-dropdown';
import Modal from '../base/modal';
import ModalBody from '../base/modal-body';
import ModalHeader from '../base/modal-header';
import ModalFooter from '../base/modal-footer';
import KeyValueEditor from '../key-value-editor/editor';
import { METHOD_GET } from '../../../common/constants';
import UriTemplate from 'uritemplate';

type Props = {};
type State = {
  onComplete: (url: string, method: string) => void,
  selectedContentType: ?string,
  selectedMethod: string,
  uriTemplate: UriTemplate,
  variables: Array<{ name: string, value: string }>,
  nunjucksPowerUserMode: boolean,
};

@autobind
class RequestFollowUpModal extends PureComponent<Props, State> {
  modal: Modal;
  editor: KeyValueEditor;

  constructor(props: Props) {
    super(props);

    this.state = {
      onComplete: (url, method) => {},
      selectedContentType: null,
      selectedMethod: METHOD_GET,
      uriTemplate: UriTemplate.parse('http://example.com{?address*}'),
      variables: [],
      nunjucksPowerUserMode: false,
    };
  }

  _setModalRef(n: Modal) {
    this.modal = n;
  }

  _setEditorRef(n: KeyValueEditor) {
    this.editor = n;
  }

  async _handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    const { uriTemplate, variables, selectedMethod } = this.state;
    const values = {};
    for (let i = 0; i < variables.length; i++) {
      const variable = variables[i];

      const varspec = uriTemplate.expressions
        .filter(expression => expression.constructor.name === 'VariableExpression')
        .map(expression => expression.varspecs)
        .reduce((prev, curr) => prev.concat(curr))
        .filter(varspec => varspec.varname === variable.name)
        .pop();

      let value = variable.value;
      if (varspec.exploded) {
        try {
          value = JSON.parse(value);
        } catch (error) {
          // use value as-is
        }
      }

      values[variable.name] = value;
    }
    this.state.onComplete(uriTemplate.expand(values), selectedMethod);

    this.hide();
  }

  _handleChangeSelectedMethod(selectedMethod: string) {
    this.setState({ selectedMethod });
  }

  _handleChange(variables: Array<{ name: string, value: string }>) {
    this.setState({ variables });
  }

  hide() {
    this.modal.hide();
  }

  show(options: {
    onComplete: Function,
    selectedMethod: string,
    url: string,
    nunjucksPowerUserMode: boolean,
  }) {
    const { onComplete, selectedMethod, url, nunjucksPowerUserMode } = options;

    let uriTemplate = UriTemplate.parse(url);
    const variables = uriTemplate.expressions
      .filter(expression => expression.constructor.name === 'VariableExpression')
      .map(expression => expression.varspecs)
      .reduce((prev, curr) => prev.concat(curr))
      .map(varspec => ({ name: varspec.varname, value: '' }));

    this.setState({ onComplete, selectedMethod, uriTemplate, variables, nunjucksPowerUserMode });

    this.modal.show();

    // Need to do this after render because modal focuses itself too
    setTimeout(() => {
      if (this.state.variables.length > 0) {
        this.editor._handleFocusValue(this.state.variables[0]);
      }
    }, 200);
  }

  render() {
    const { selectedMethod, uriTemplate, variables, nunjucksPowerUserMode } = this.state;

    return (
      <Modal ref={this._setModalRef}>
        <ModalHeader>Execute Request</ModalHeader>
        <ModalBody className="pad" noScroll>
          <form onSubmit={this._handleSubmit}>
            <div className="form-row">
              <div className="form-control form-control--outlined">
                <div>{uriTemplate.templateText}</div>
              </div>
              <div className="form-control form-control--no-label" style={{ width: 'auto' }}>
                <MethodDropdown
                  right
                  className="btn btn--clicky no-wrap"
                  method={selectedMethod}
                  onChange={this._handleChangeSelectedMethod}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="pad-bottom scrollable-container">
                <div className="scrollable" style={{ height: '10rem', position: 'relative' }}>
                  <KeyValueEditor
                    ref={this._setEditorRef}
                    maxPairs={variables.length}
                    allowMultiline={false}
                    sortable
                    namePlaceholder="Variable"
                    valuePlaceholder="Value"
                    pairs={variables}
                    nunjucksPowerUserMode={nunjucksPowerUserMode}
                    onChange={this._handleChange}
                  />
                </div>
              </div>
            </div>
          </form>
        </ModalBody>
        <ModalFooter>
          <button className="btn" onClick={this._handleSubmit}>
            Execute
          </button>
        </ModalFooter>
      </Modal>
    );
  }
}

export default RequestFollowUpModal;

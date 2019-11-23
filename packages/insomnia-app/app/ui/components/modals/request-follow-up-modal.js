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
import BodyEditor from '../editors/body/body-editor';
import type { Settings } from '../../../models/settings';
import type { RequestBody, RequestParameter } from '../../../models/request';

type Props = {};
type State = {
  onComplete: ?(url: string, method: string, body: string) => void,
  selectedContentType: ?string,
  selectedMethod: string,
  uriTemplate: UriTemplate,
  variables: Array<{ name: string, value: string }>,
  body: RequestBody,
  params: Array<RequestParameter>,
  nunjucksPowerUserMode: boolean,
  settings: Settings,
  request: Request,
};

@autobind
class RequestFollowUpModal extends PureComponent<Props, State> {
  modal: Modal;
  editor: ?KeyValueEditor;

  constructor(props: Props) {
    super(props);

    this.state = {
      onComplete: (url, method) => {},
      selectedContentType: null,
      selectedMethod: METHOD_GET,
      uriTemplate: UriTemplate.parse('http://example.com{?address*}'),
      variables: [],
      request: {},
      settings: {},
      body: {},
      params: [],
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
    const { uriTemplate, variables, selectedMethod, body, params } = this.state;
    const values = {};
    for (let i = 0; i < variables.length; i++) {
      const variable = variables[i];

      const varspec = uriTemplate.expressions
        .filter(expression => expression.constructor.name === 'VariableExpression')
        .map(expression => expression.varspecs)
        .reduce((prev, curr) => prev.concat(curr), [])
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
    this.state.onComplete(uriTemplate.expand(values), selectedMethod, body, params);

    this.hide();
  }

  _handleChangeSelectedMethod(selectedMethod: string) {
    this.setState({ selectedMethod });
  }

  _handleVariableChange(variables: Array<{ name: string, value: string }>) {
    this.setState({ variables });
  }

  _handleUpdateRequestParameters(params: Array<RequestParameter>) {
    this.setState({ params });
  }

  _handleBodyChange(request: Request, body: any) {
    console.log(body);
    // TODO put body to state and use later to build actual request body
    //   find out how Greg does that
    // TODO use multiline for exploded
    this.setState({ body });
  }

  hide() {
    this.modal.hide();
  }

  show(options: {
    onComplete: Function,
    selectedMethod: string,
    url: string,
    nunjucksPowerUserMode?: boolean,
    settings: Settings,
    request: Request,
  }) {
    const { onComplete, selectedMethod, url, nunjucksPowerUserMode, settings, request } = options;
    this.setState({ body: request.body, params: request.parameters });
    let uriTemplate = UriTemplate.parse(url);
    const variables = uriTemplate.expressions
      .filter(expression => expression.constructor.name === 'VariableExpression')
      .map(expression => expression.varspecs)
      .reduce((prev, curr) => prev.concat(curr), [])
      .map(varspec => ({ name: varspec.varname, value: '' }));

    this.setState({
      onComplete,
      selectedMethod,
      uriTemplate,
      variables,
      nunjucksPowerUserMode,
      settings,
      request,
    });

    this.modal.show();

    // Need to do this after render because modal focuses itself too
    setTimeout(() => {
      if (this.state.variables.length > 0) {
        this.editor._handleFocusValue(this.state.variables[0]);
      }
    }, 200);
  }

  // TODO use KeyValueEditor if type is form, set json on codeeditor for json
  render() {
    const {
      selectedMethod,
      uriTemplate,
      variables,
      nunjucksPowerUserMode,
      settings,
      request,
    } = this.state;

    return (
      <Modal ref={this._setModalRef}>
        <ModalHeader>Execute Request</ModalHeader>
        <ModalBody className="pad" noScroll>
          <form onSubmit={this._handleSubmit}>
            <div className="form-row">
              <div className="form-control">
                <div>{uriTemplate.templateText}</div>
              </div>
              <div className="form-control" style={{ width: 'auto' }}>
                <MethodDropdown
                  right
                  className="btn btn--clicky no-wrap"
                  method={selectedMethod}
                  onChange={this._handleChangeSelectedMethod}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="no-pad-top scrollable-container">
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
                    onChange={this._handleVariableChange}
                  />
                </div>
              </div>
            </div>
            <div className="form-row">
              <div className="no-pad-bottom scrollable-container">
                <div
                  className="scrollable"
                  style={{
                    height: '16rem',
                    position: 'relative',
                    border: '1px solid var(--hl-md)',
                  }}>
                  <KeyValueEditor
                    sortable
                    allowMultiline={false}
                    namePlaceholder="name"
                    valuePlaceholder="value"
                    pairs={request.parameters}
                    // handleRender={handleRender}
                    // handleGetRenderContext={handleGetRenderContext}
                    nunjucksPowerUserMode={settings.nunjucksPowerUserMode}
                    // isVariableUncovered={isVariableUncovered}
                    onChange={this._handleUpdateRequestParameters}
                  />
                </div>
              </div>
            </div>
            <div className="form-row">
              <div className="no-pad-bottom scrollable-container">
                <div
                  className="scrollable"
                  style={{
                    height: '16rem',
                    position: 'relative',
                    border: '1px solid var(--hl-md)',
                  }}>
                  <BodyEditor
                    //  ref={this._setBodyEditorRef}
                    // key={uniqueKey}
                    // handleUpdateRequestMimeType={updateRequestMimeType}
                    // **handleRender={handleRender}
                    // **handleGetRenderContext={handleGetRenderContext}
                    request={request}
                    // workspace={workspace}
                    // environmentId={environmentId}
                    settings={settings}
                    onChange={this._handleBodyChange}
                    // onChangeHeaders={forceUpdateRequestHeaders}
                    nunjucksPowerUserMode={nunjucksPowerUserMode}
                    // **isVariableUncovered={isVariableUncovered}
                  />
                </div>
              </div>
            </div>
          </form>
        </ModalBody>
        <ModalFooter>
          <button className="btn" type="exec-request" onClick={this._handleSubmit}>
            Execute
          </button>
        </ModalFooter>
      </Modal>
    );
  }
}

export default RequestFollowUpModal;

module.exports = function newRequest(url, method, bodyText, headers) {
  return {
    url,
    name: 'New Request',
    description: '',
    method,
    body: { text: bodyText },
    parameters: [],
    headers: headers,
    authentication: {},
    metaSortKey: -1 * Date.now(),
    isPrivate: false,
    history: {
      current: -1,
      responses: [],
      requested: [],
    },

    // Settings
    settingStoreCookies: true,
    settingSendCookies: true,
    settingDisableRenderRequestBody: false,
    settingEncodeUrl: true,
    settingRebuildPath: true,
  };
};

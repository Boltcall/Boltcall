const authentication = require('./authentication');
const newLead = require('./triggers/new_lead');
const sendLead = require('./creates/send_lead');
const findLead = require('./searches/find_lead');

module.exports = {
  version: '1.0.0',
  platformVersion: require('zapier-platform-core').version,
  authentication,
  beforeRequest: [
    (request) => {
      request.headers = request.headers || {};
      request.headers['User-Agent'] = 'Boltcall-Zapier/1.0';
      return request;
    },
  ],
  triggers: {
    [newLead.key]: newLead,
  },
  creates: {
    [sendLead.key]: sendLead,
  },
  searches: {
    [findLead.key]: findLead,
  },
};

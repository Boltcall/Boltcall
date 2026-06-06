const BASE_URL = 'https://boltcall.org/.netlify/functions';

const perform = async (z, bundle) => {
  const response = await z.request({
    url: `${BASE_URL}/api-leads`,
    params: {
      api_key: bundle.authData.api_key,
    },
  });
  return response.data;
};

module.exports = {
  key: 'new_lead',
  noun: 'Lead',
  display: {
    label: 'New Lead',
    description: 'Triggers when Boltcall captures a new lead.',
  },
  operation: {
    perform,
    sample: {
      id: 'lead_123',
      first_name: 'Jane',
      last_name: 'Doe',
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+15551112222',
      source: 'facebook_lead_ad',
      status: 'pending',
      created_at: '2026-06-06T10:00:00.000Z',
      first_touch_status: 'started',
      retell_call_started: true,
      external_id: 'fb-123',
    },
    outputFields: [
      { key: 'id', label: 'Lead ID' },
      { key: 'name', label: 'Name' },
      { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'source', label: 'Source' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Created At' },
      { key: 'first_touch_status', label: 'First Touch Status' },
      { key: 'retell_call_started', label: 'Call Started', type: 'boolean' },
      { key: 'external_id', label: 'External ID' },
      { key: 'idempotency_key', label: 'Idempotency Key' },
    ],
  },
};

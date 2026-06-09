const BASE_URL = 'https://boltcall.org/.netlify/functions';

const perform = async (z, bundle) => {
  const response = await z.request({
    url: `${BASE_URL}/api-lead-search`,
    params: {
      api_key: bundle.authData.api_key,
      email: bundle.inputData.email,
      phone: bundle.inputData.phone,
      external_id: bundle.inputData.external_id,
      idempotency_key: bundle.inputData.idempotency_key,
    },
  });
  return response.data;
};

module.exports = {
  key: 'find_lead',
  noun: 'Lead',
  display: {
    label: 'Find Lead',
    description: 'Finds a Boltcall lead by email, phone, external ID, or idempotency key.',
  },
  operation: {
    inputFields: [
      { key: 'email', label: 'Email', required: false },
      { key: 'phone', label: 'Phone', required: false },
      { key: 'external_id', label: 'External ID', required: false },
      { key: 'idempotency_key', label: 'Idempotency Key', required: false },
    ],
    perform,
    sample: {
      id: 'lead_123',
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+15551112222',
      source: 'zapier',
      status: 'pending',
      created_at: '2026-06-06T10:00:00.000Z',
    },
  },
};

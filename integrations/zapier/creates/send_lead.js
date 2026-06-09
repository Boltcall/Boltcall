const BASE_URL = 'https://boltcall.org/.netlify/functions';

const perform = async (z, bundle) => {
  const lead = {
    first_name: bundle.inputData.first_name,
    last_name: bundle.inputData.last_name,
    name: bundle.inputData.name,
    email: bundle.inputData.email,
    phone: bundle.inputData.phone,
    source: bundle.inputData.source || 'zapier',
    notes: bundle.inputData.notes,
    external_id: bundle.inputData.external_id,
    idempotency_key: bundle.inputData.idempotency_key,
  };

  const response = await z.request({
    method: 'POST',
    url: `${BASE_URL}/lead-webhook`,
    headers: {
      Authorization: `Bearer ${bundle.authData.api_key}`,
      'Content-Type': 'application/json',
    },
    body: lead,
  });

  const body = response.data;
  return {
    ...(body.lead || {}),
    outcome_status: body.outcome?.status,
    first_touch_status: body.outcome?.first_touch_status,
    retell_call_started: body.outcome?.retell_call_started,
    deduped: Boolean(body.outcome?.deduped),
  };
};

module.exports = {
  key: 'send_lead',
  noun: 'Lead',
  display: {
    label: 'Send Lead to Boltcall',
    description: 'Creates a lead in Boltcall and starts the speed-to-lead response.',
  },
  operation: {
    inputFields: [
      { key: 'name', label: 'Full Name', required: false },
      { key: 'first_name', label: 'First Name', required: false },
      { key: 'last_name', label: 'Last Name', required: false },
      { key: 'email', label: 'Email', required: false },
      { key: 'phone', label: 'Phone', required: false },
      { key: 'source', label: 'Source', required: false, default: 'zapier' },
      { key: 'notes', label: 'Notes', required: false },
      { key: 'external_id', label: 'External ID', required: false },
      { key: 'idempotency_key', label: 'Idempotency Key', required: false },
    ],
    perform,
    sample: {
      id: 'lead_123',
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      phone: '+15551112222',
      source: 'zapier',
      status: 'pending',
      first_touch_status: 'started',
      retell_call_started: true,
      deduped: false,
    },
  },
};

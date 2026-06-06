const BASE_URL = 'https://boltcall.org/.netlify/functions';

const test = async (z, bundle) => {
  const response = await z.request({
    url: `${BASE_URL}/api-me`,
    headers: {
      Authorization: `Bearer ${bundle.authData.api_key}`,
    },
  });
  return response.data;
};

module.exports = {
  type: 'custom',
  fields: [
    {
      key: 'api_key',
      label: 'Boltcall API Key',
      required: true,
      type: 'password',
      helpText: 'Create a key in Boltcall Dashboard > Settings > API Keys. It starts with bc_.',
    },
  ],
  test,
  connectionLabel: '{{business_name}}',
};

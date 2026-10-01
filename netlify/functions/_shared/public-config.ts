// Non-secret config kept in code so it doesn't eat the AWS Lambda 4KB env
// budget (Netlify free plan has no per-scope env vars). This repo is PUBLIC:
// only IDs/URLs that are useless without a separate secret belong here.
// A same-named env var still overrides; an explicitly empty one disables.
const DEFAULTS = {
  GOOGLE_CLIENT_ID: '233451801522-8sbq593aoglgf557geo5jactf32kigbk.apps.googleusercontent.com',
  FB_APP_ID: '3287663841371693',
  AZURE_OPENAI_FOUNDRY_ENDPOINT: 'https://noamj-mormcbeh-eastus2.cognitiveservices.azure.com',
  AZURE_OPENAI_ENDPOINT: 'https://boltcall-openai.openai.azure.com/',
  RETELL_DEMO_AGENT_ID: 'agent_1573391f24e9e0ff2bc0e64e7c',
  CHALLENGE_AGENT_ID: 'agent_e74d27462aaa6e7481ad9d6011',
  FOUNDER_UUID: 'a836439d-7ca3-44ed-8064-f759c1ea391e', // noamyakoby6@gmail.com
  ALLOWED_ORIGINS: 'https://boltcall.org,https://www.boltcall.org,http://localhost:5173',
};

export function publicEnv(name: keyof typeof DEFAULTS): string {
  return process.env[name] ?? DEFAULTS[name];
}

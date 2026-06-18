import { withLambda } from '@netlify/aws-lambda-compat';
import type { LambdaHandler } from '@netlify/aws-lambda-compat';
import type { Handler } from '@netlify/functions';

// Bridge the repo's existing Lambda-style handlers onto Netlify's current runtime.
export function withLegacyHandler(handler: Handler) {
  return withLambda(handler as unknown as LambdaHandler);
}

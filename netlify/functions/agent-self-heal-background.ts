// ponytail: same handler as agent-self-heal, run as a Netlify background
// function (202 to the caller, up to 15 min) so multi-minute heal runs finish.
export { default } from './agent-self-heal';

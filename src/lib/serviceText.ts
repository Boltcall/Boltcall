// Services can arrive without price or duration (law-firm practice areas).
// Never let "null minutes" or "$null" reach an agent's knowledge.
const known = (v: unknown) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

export function serviceDetails(s: { duration?: unknown; price?: unknown }): string {
  return [known(s.duration) && `${s.duration} minutes`, known(s.price) && `$${s.price}`]
    .filter(Boolean)
    .join(', ');
}

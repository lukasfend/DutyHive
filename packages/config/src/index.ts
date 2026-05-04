// @dutyhive/config — re-exports for convenience.
// Import the specific submodule when you only need one (e.g. '@dutyhive/config/brand').
//
// No .js extensions on relative imports: Next.js transpilePackages routes these
// through webpack which resolves bare specifiers via its extensions list.

export { brand } from './brand';
export { subdomains, resolveSubdomain, type Subdomain } from './subdomains';
export { flags } from './flags';
export {
  intendedPurpose,
  type IntendedPurpose,
  type RiskClass,
  type ToolKey,
} from './intended-purpose';

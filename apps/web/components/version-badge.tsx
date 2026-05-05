/**
 * VersionBadge — unobtrusive version + build SHA indicator.
 *
 * Format: `vX.Y.Z[-channel.n] · build <short-sha>` (build hidden if no SHA).
 *
 * Why visible: transparency for users (quotable in bug reports), debuggability
 * (visible at a glance which build is running where), and a soft form of
 * build-integrity indication. See `docs/quality/versioning.md`.
 */

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';
const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA ?? '';

export function VersionBadge({ className }: { className?: string }) {
  const isDev = process.env.NODE_ENV !== 'production';
  const versionText = isDev ? `dev · ${BUILD_SHA || 'local'}` : `v${APP_VERSION}`;
  const buildText = !isDev && BUILD_SHA ? ` · build ${BUILD_SHA}` : '';

  return (
    <span
      className={'inline-block text-xs text-gray-500 tabular-nums ' + (className ?? '')}
      aria-label="Version und Build"
      title={isDev ? 'Development build' : `Version ${APP_VERSION}${buildText}`}
    >
      {versionText}
      {buildText}
    </span>
  );
}

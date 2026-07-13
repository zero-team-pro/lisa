import express, { Router } from 'express';

export type ApiMajorVersion = `v${number}`;
export type ApiVersions = Partial<Record<ApiMajorVersion, Router>>;

/**
 * Mounts independently versioned HTTP contracts inside one API domain.
 *
 * Domain routers own the stable prefix (`/notify`, `/server`, ...), while this
 * router owns the major-version segment. A new version may reuse the same
 * services and unchanged handlers, but must provide an explicit version router.
 */
export const createVersionedRouter = (versions: ApiVersions): Router => {
  const router = express.Router();

  for (const [version, versionRouter] of Object.entries(versions)) {
    if (!/^v[1-9]\d*$/.test(version)) {
      throw new Error(`Invalid API major version: ${version}`);
    }
    if (versionRouter) {
      router.use(`/${version}`, versionRouter);
    }
  }

  return router;
};

/** Creates a new contract map by replacing only handlers changed in a version. */
export const extendVersionHandlers = <Handlers extends object>(
  base: Handlers,
  overrides: Partial<Handlers>,
): Handlers => ({ ...base, ...overrides });

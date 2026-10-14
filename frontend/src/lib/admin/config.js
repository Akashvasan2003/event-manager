export const DEPLOYMENT_TARGETS = {
  frontendUrl: process.env.GOPRATLE_FRONTEND_URL || 'https://event-manager-three-kohl.vercel.app',
  backendUrl: (process.env.GOPRATLE_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://gopratle-api.onrender.com').replace(/\/+$/, ''),
  githubOwner: process.env.GOPRATLE_GITHUB_OWNER || 'Akashvasan2003',
  githubRepo: process.env.GOPRATLE_GITHUB_REPO || 'event-manager',
  githubBranch: process.env.GOPRATLE_GITHUB_BRANCH || 'master',
  expectedCommit: process.env.GOPRATLE_EXPECTED_COMMIT || 'f9c91fd',
  renderServiceName: process.env.RENDER_SERVICE_NAME || 'gopratle-api',
  renderRootDir: 'backend',
  renderBuildCommand: 'npm install',
  renderStartCommand: 'npm start',
  renderHealthPath: '/api/health',
  atlasDatabaseName: process.env.ATLAS_DATABASE_NAME || 'gopratle',
  atlasClusterName: process.env.ATLAS_CLUSTER_NAME || 'Cluster0',
};

export const REQUIRED_VERCEL_ENV = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'ADMIN_DASHBOARD_USER',
  'ADMIN_DASHBOARD_PASSWORD',
  'ADMIN_SESSION_SECRET',
  'RENDER_API_KEY',
  'RENDER_SERVICE_ID',
  'ATLAS_CLIENT_ID',
  'ATLAS_CLIENT_SECRET',
  'ATLAS_GROUP_ID',
  'ATLAS_CLUSTER_NAME',
  'GITHUB_TOKEN',
  'GOPRATLE_BACKEND_URL',
  'GOPRATLE_FRONTEND_URL',
];

export function isConfiguredSecret(value) {
  return Boolean(value) && !/^replace-with-|dev-only|change-me/i.test(value);
}

export function envPresence() {
  return Object.fromEntries(REQUIRED_VERCEL_ENV.map((key) => [key, isConfiguredSecret(process.env[key])]));
}

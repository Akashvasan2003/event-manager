import { DEPLOYMENT_TARGETS } from './config';
import { jsonFetch } from './http';

const API = 'https://cloud.mongodb.com/api/atlas/v2';

async function atlasToken() {
  if (!process.env.ATLAS_CLIENT_ID || !process.env.ATLAS_CLIENT_SECRET) return null;
  const basic = Buffer.from(`${process.env.ATLAS_CLIENT_ID}:${process.env.ATLAS_CLIENT_SECRET}`).toString('base64');
  const res = await jsonFetch('https://cloud.mongodb.com/api/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  return res.ok ? res.body?.access_token : null;
}

async function atlasGet(path, token) {
  return jsonFetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.atlas.2025-03-12+json',
    },
  });
}

export async function getAtlasOverview() {
  if (!process.env.ATLAS_CLIENT_ID || !process.env.ATLAS_CLIENT_SECRET) {
    return { configured: false, status: 'missing_credentials', message: 'Atlas service account credentials are not configured.' };
  }

  const token = await atlasToken();
  if (!token) return { configured: true, status: 'auth_failed', message: 'Atlas OAuth token request failed.' };

  let groupId = process.env.ATLAS_GROUP_ID;
  let projects = [];
  if (!groupId) {
    const groups = await atlasGet('/groups', token);
    projects = groups.ok ? groups.body?.results || [] : [];
    groupId = projects[0]?.id;
  }

  if (!groupId) {
    return { configured: true, status: 'project_missing', message: 'No Atlas project was found. Set ATLAS_GROUP_ID explicitly.' };
  }

  const clusterName = process.env.ATLAS_CLUSTER_NAME || DEPLOYMENT_TARGETS.atlasClusterName;
  const [projectRes, clusterRes, usersRes] = await Promise.all([
    atlasGet(`/groups/${groupId}`, token),
    atlasGet(`/groups/${groupId}/clusters/${encodeURIComponent(clusterName)}`, token),
    atlasGet(`/groups/${groupId}/databaseUsers`, token),
  ]);

  const users = usersRes.ok ? usersRes.body?.results || [] : [];
  return {
    configured: true,
    status: clusterRes.ok ? 'ok' : 'cluster_unavailable',
    project: projectRes.ok ? { id: projectRes.body?.id, name: projectRes.body?.name } : { id: groupId },
    cluster: clusterRes.ok
      ? {
          name: clusterRes.body?.name,
          stateName: clusterRes.body?.stateName,
          mongoURI: clusterRes.body?.mongoURI ? '[redacted]' : null,
          provider: clusterRes.body?.providerSettings?.providerName,
          region: clusterRes.body?.providerSettings?.regionName,
          instanceSize: clusterRes.body?.providerSettings?.instanceSizeName,
        }
      : { name: clusterName, error: clusterRes.body?.detail || clusterRes.body?.reason || 'Cluster lookup failed.' },
    databaseName: DEPLOYMENT_TARGETS.atlasDatabaseName,
    databaseUsers: users.map((user) => ({
      username: user.username,
      databaseName: user.databaseName,
      roles: user.roles?.map((role) => `${role.roleName}@${role.databaseName}`) || [],
    })),
  };
}

import {GoogleAuth,Impersonated} from 'google-auth-library';
import { createSign } from 'node:crypto';
import { ApiAccessError } from './apiAuthorizationService.js';
export interface RosterMapping { tab: string; range: string; email: string; fullName: string; department: string; country: string }
export function parseRoster(values: unknown[][], mapping: RosterMapping, department: string, options: {allowEmpty?: boolean} = {}) {
  if (!values.length) throw new ApiAccessError('Roster is empty.', 422);
  const headers = values[0].map(value => String(value ?? '').trim());
  const fields = ['email', 'fullName', 'department', 'country'] as const;
  const indices = Object.fromEntries(fields.map(field => {
    if (field === 'fullName' && !mapping[field]) return [field, -1];
    const matching = headers.map((header, i) => header === mapping[field] ? i : -1).filter(i => i >= 0);
    if (matching.length !== 1) throw new ApiAccessError(`Roster requires one ${field} header.`, 422);
    return [field, matching[0]];
  })) as Record<typeof fields[number], number>;
  const rows: Array<{ email: string; fullName: string; department: string; country: string }> = [];
  const emails = new Set<string>();
  for (const cells of values.slice(1)) {
    if (cells.every(value => !String(value ?? '').trim())) continue;
    const row = Object.fromEntries(fields.map(field => [field, String(cells[indices[field]] ?? '').trim()])) as typeof rows[number];
    row.email = row.email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) || row.email.length > 254 || mapping.fullName && row.fullName.length < 2 || row.fullName.length > 120 || !row.country || !row.department) throw new ApiAccessError('Roster contains invalid required fields.', 422);
    if (emails.has(row.email)) throw new ApiAccessError('Roster contains duplicate emails.', 422);
    emails.add(row.email);
    if (row.department === department) rows.push(row);
  }
  if ((!rows.length && !options.allowEmpty) || rows.length > 500) throw new ApiAccessError('The selected department requires a valid roster within 500 rows.', 422);
  return rows;
}
const cachedTokens=new Map<string,{email:string;keyId:string;token:string;expires:number}>();
export async function googleAccessToken(scope='https://www.googleapis.com/auth/spreadsheets.readonly') {
  if(!process.env.GOOGLE_SERVICE_ACCOUNT_JSON){
    const target=process.env.GOOGLE_WORKSPACE_SERVICE_ACCOUNT;
    if(!target)throw new ApiAccessError('Workspace service identity is not configured.',503);
    const previous=cachedTokens.get(scope);if(previous?.email===target&&previous.expires>Date.now()+60000)return previous.token;
    const source=await new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']}).getClient();
    const client=new Impersonated({sourceClient:source as any,targetPrincipal:target,targetScopes:[scope],lifetime:3600});
    let token;try{token=await client.getAccessToken();}catch{throw new ApiAccessError('Workspace identity cannot obtain a read-only Google token. Check existing delegation.',503);}if(!token.token)throw new ApiAccessError('Workspace service token unavailable.',503);
    cachedTokens.set(scope,{email:target,keyId:'ADC',token:token.token,expires:Date.now()+3500000});return token.token;
  }
  let account: any;
  try { account = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || ''); }
  catch { throw new ApiAccessError('Google service account configuration is unavailable.', 503); }
  if (!account.client_email || !account.private_key || account.type !== 'service_account') throw new ApiAccessError('Google service account configuration is invalid.', 503);
  const cached=cachedTokens.get(scope);
  if (cached && cached.email === account.client_email && cached.keyId === account.private_key_id && cached.expires > Date.now() + 60000) return cached.token;
  const enc = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const input = enc({ alg: 'RS256', typ: 'JWT' }) + '.' + enc({ iss: account.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const assertion = input + '.' + createSign('RSA-SHA256').update(input).sign(account.private_key, 'base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new ApiAccessError('Google service authentication failed.', 503);
  const result = await response.json();
  if (!result.access_token || !Number.isFinite(result.expires_in)) throw new ApiAccessError('Google service authentication returned invalid credentials.', 503);
  cachedTokens.set(scope,{ email: account.client_email, keyId: account.private_key_id, token: result.access_token, expires: Date.now() + result.expires_in * 1000 });
  return result.access_token as string;
}
export async function readRoster(sheetId: string, mapping: RosterMapping, department: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(sheetId) || !mapping.tab?.trim() || mapping.tab.length > 100 || !/^[A-Z]{1,2}\d+:[A-Z]{1,2}\d+$/.test(mapping.range || '')) throw new ApiAccessError('A bounded Sheet tab and range are required.', 422);
  const match = mapping.range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)!;
  const column = (value: string) => [...value].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  const rowCount = Number(match[4]) - Number(match[2]) + 1, colCount = column(match[3]) - column(match[1]) + 1;
  if (rowCount < 1 || colCount < 1 || rowCount * colCount > 50000) throw new ApiAccessError('Sheet range is invalid or too large.', 422);
  const range = `'${mapping.tab.replace(/'/g, "''")}'!${mapping.range}`;
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`, { headers: { Authorization: `Bearer ${await googleAccessToken()}` }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new ApiAccessError('The configured Sheet could not be read. Check sharing and Sheets API access.', 503);
  const result = await response.json();
  return parseRoster(result.values || [], mapping, department);
}

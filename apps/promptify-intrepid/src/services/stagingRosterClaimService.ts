import {sqlTransaction} from './cloudPostgresService';

/** Fixed server-side staging scope. Never accept class IDs or Sheet IDs from a request. */
export const STAGING_ROSTER_FIXTURES = [
  {
    classId: '9c32e26b-bcda-4549-bca8-dd4f350c2aaa',
    classCode: 'STAGING-SYNTHETIC-20261020-NORTHSTAR',
    sheetId: '192FSgBS3yLEDrEaWIpv_sQJ40d2nnuDWGFEbDT7UhRM'
  },
  {
    classId: 'f6a40278-c5ab-42f2-9948-abb2fd1431bb',
    classCode: 'STAGING-SYNTHETIC-20261020-JUNIPER',
    sheetId: '19PpiiiA4goQyKqck2Xb-vvFDJZ-MM0dxG1m7B2nJVvw'
  }
] as const;

export type StagingRosterClaim = {
  logId: string;
  classId: string;
  sheetId: string;
  mapping: Record<string, unknown>;
  department: string;
};

const approvedScopeSql = `
  ((c.id=$1::uuid AND c.class_code=$2 AND s.sheet_id=$3)
   OR (c.id=$4::uuid AND c.class_code=$5 AND s.sheet_id=$6))`;
const approvedScopeValues = STAGING_ROSTER_FIXTURES.flatMap(fixture => [fixture.classId, fixture.classCode, fixture.sheetId]);

/** Atomically claims one due source, restricted to the two approved synthetic class/Sheet pairs. */
export async function claimStagingRosterSync(): Promise<StagingRosterClaim | null> {
  return sqlTransaction(undefined, async client => {
    await client.query(`
      UPDATE public.product_sync_logs l
      SET status='failed',error_code='worker_timeout',finished_at=now()
      FROM public.product_sheet_connections s
      JOIN public.classes c ON c.id=s.class_id
      WHERE l.connection_id=s.id AND ${approvedScopeSql}
        AND l.status='running' AND l.created_at<now()-interval '5 minutes'`, approvedScopeValues);

    const selected = await client.query(`
      SELECT s.id AS connection_id,s.class_id,s.created_by,s.sheet_id,s.column_mapping,
             c.department,c.class_code
      FROM public.product_sheet_connections s
      JOIN public.classes c ON c.id=s.class_id
      JOIN public.users u ON u.id=s.created_by
      WHERE ${approvedScopeSql}
        AND s.auto_sync AND c.status IN ('active','upcoming')
        AND u.auth_provider_id IS NOT NULL
        -- QA-only cadence override for these two fixed fixtures; it intentionally does not follow workbook next_sync_at.
        AND coalesce(s.last_attempt_at,s.last_synced_at,'epoch'::timestamptz)<now()-interval '5 minutes'
        AND NOT EXISTS(SELECT 1 FROM public.product_sync_logs l
                       WHERE l.connection_id=s.id AND l.status='running')
      ORDER BY coalesce(s.last_attempt_at,s.last_synced_at,'epoch'::timestamptz),s.id
      LIMIT 1 FOR UPDATE OF s SKIP LOCKED`, approvedScopeValues);
    const connection = selected.rows[0];
    if (!connection) return null;

    await client.query('UPDATE public.product_sheet_connections SET last_attempt_at=now() WHERE id=$1', [connection.connection_id]);
    const inserted = await client.query(`
      INSERT INTO public.product_sync_logs(connection_id,class_id,actor_id,request_id,status)
      VALUES($1,$2,$3,gen_random_uuid(),'running') RETURNING id`,
    [connection.connection_id,connection.class_id,connection.created_by]);
    return {
      logId: inserted.rows[0].id,
      classId: connection.class_id,
      sheetId: connection.sheet_id,
      mapping: connection.column_mapping,
      department: connection.department
    };
  });
}

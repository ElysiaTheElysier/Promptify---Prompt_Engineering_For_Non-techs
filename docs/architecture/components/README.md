# Source evidence cho LikeC4 edges

[Model](../system-context/intrepid.c4) có context/container/backend/database/deployment views. Node service trong model diễn tả module/runtime hiện có, không đề xuất thêm service deploy. GCP topology là target theo configs, không inventory live.

| Edge / component | Source authority | Ý nghĩa / giới hạn |
|---|---|---|
| Actor → React | [ProductionApp](../../../apps/promptify-intrepid/src/components/rebuild/ProductionApp.tsx) | UI00–15, role-specific entry/screen |
| React → API named action | [productionClientService](../../../apps/promptify-intrepid/src/services/productionClientService.ts), [product API](../../../apps/promptify-intrepid/api/product.ts) | Không gọi SQL/provider trực tiếp từ browser |
| HTTP → identity → dispatcher | [cloudRunServer](../../../apps/promptify-intrepid/src/services/cloudRunServer.ts), [productionServerService](../../../apps/promptify-intrepid/src/services/productionServerService.ts) | Auth errors và action payload validation |
| Identity → Firebase/SQL mapping | [firebaseServerIdentityService](../../../apps/promptify-intrepid/src/services/firebaseServerIdentityService.ts) | Verify revocation, issuer/UID, stable business UUID, ambiguity denial |
| Dispatcher → transaction adapter | [cloudDatabaseService](../../../apps/promptify-intrepid/src/services/cloudDatabaseService.ts), [cloudPostgresService](../../../apps/promptify-intrepid/src/services/cloudPostgresService.ts) | Parameterized SQL, metadata relations, scoped transaction role |
| Saved run → SQL/Vertex | [rebuildRunService](../../../apps/promptify-intrepid/src/services/rebuildRunService.ts), [productionAiService](../../../apps/promptify-intrepid/src/services/productionAiService.ts) | Begin/finish/claim RPC + snapshot, configured Generate/Judge |
| SOP → GCS/embedding/retrieval | [sopIngestionService](../../../apps/promptify-intrepid/src/services/sopIngestionService.ts), [cloudStorageService](../../../apps/promptify-intrepid/src/services/cloudStorageService.ts), [cloudSopRetrievalService](../../../apps/promptify-intrepid/src/services/cloudSopRetrievalService.ts) | Private owner scope, citation/model provenance, fallback contract |
| SQL → Vertex native | [004 pgvector integration](../../../apps/promptify-intrepid/gcp/sql/004_pgvector_vertex.sql) | `google_ml_integration` requires GCP instance/IAM; local double not proof native endpoint |
| Worker → Sheets/SQL | [rosterWorkerService](../../../apps/promptify-intrepid/src/services/rosterWorkerService.ts), [googleRosterService](../../../apps/promptify-intrepid/src/services/googleRosterService.ts) | Claim/import/reconcile/log, private invocation |
| Worker → Firestore/BQ | [cloudProjectionService](../../../apps/promptify-intrepid/src/services/cloudProjectionService.ts), [cloudBigQueryService](../../../apps/promptify-intrepid/src/services/cloudBigQueryService.ts) | Current canonical state, consumer revisions/tombstones, warehouse mode |
| React → Firestore | [cloudRealtimeService](../../../apps/promptify-intrepid/src/services/cloudRealtimeService.ts) | Invalidation/read refresh, own user rules; polling fallback retained |
| Scheduler / runtime identity / Secret Manager | [GCP setup](../../gcp/SETUP_GUIDE.md), [templates](../../../apps/promptify-intrepid/gcp/README.md) | User performs actual setup; template is not deployed proof |
| Database domain relationships | [Native schema explorer](../../database/schema-explorer/README.md), [ownership](../../gcp-database-clean-audit/DATA_OWNERSHIP_AND_INTEGRITY.md) | Physical FK edges + explicit snapshot/event semantics, no assumed row counts |

Feature-level file/function/SQL operations và test contracts xem [feature parity matrix](../../gcp-database-clean-audit/FEATURE_PARITY_MATRIX.md). Danh sách đó giữ UI00–15/43 named actions và toàn bộ workflows; khi source thêm action, update matrix và test chứ không mặc định mọi branch đã có E2E proof.

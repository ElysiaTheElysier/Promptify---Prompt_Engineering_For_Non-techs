# Local database explorer

Trang chủ website local có domain navigation, full 50-table ERD, từng table dictionary và native SchemaSpy/LikeC4 links. Generated output đặt ở ignored `outputs/intrepid-docs`, sources/generator nằm repo. Không có live rows/PII.

`python scripts/build_intrepid_docs.py --catalog outputs/gcp-db-clean-audit/tbls-source-derived.json` sinh bản nguồn audit 13/10/2026 trước fixes. Để refresh sau fixes, dùng tbls thật introspect DB synthetic local hoặc Cloud SQL staging đã được người dùng setup, rồi truyền native JSON mới; ownership annotations vẫn cần review với source. Công cụ introspect catalog không chứng minh provider/IAM hay business test đã PASS.

```powershell
# Local synthetic ONLY. Không đưa password vào command logs.
$env:TBLS_DSN = 'postgres://postgres@127.0.0.1:55432/intrepid_correctness?sslmode=disable'
tmp/gcp-db-audit-tools/tbls/unpacked/tbls.exe out $env:TBLS_DSN -t json -o outputs/intrepid-local-catalog.json
python scripts/build_intrepid_docs.py --catalog outputs/intrepid-local-catalog.json --provenance 'LOCAL SYNTHETIC PostgreSQL; Google ML external call double; NOT CLOUD SQL STAGING'
```

Sau Cloud SQL staging, đi qua reviewed Auth Proxy/connector trên loopback, dùng credential/catalog account đọc-only do user cung cấp qua environment. Không cần source rows. `tbls out` với DSN environment sinh catalog JSON; dùng provenance chứa instance/version/schema capture time đã redacted, không password/token.

SchemaSpy được chạy bằng [wrapper](../../../scripts/render_intrepid_schemaspy.py) trên loopback synthetic catalog, không đọc rows (`-norows`). Wrapper không tự provision DB/cloud. Live introspection có explicit opt-in `--allow-staging`, không chạy production. SchemaSpy cần Java17+, JDBC42.7.10, jar7.0.2, Graphviz hoặc bundled vizjs. Detailed RPC/trigger writers vẫn được explorer bổ sung bằng source annotations vì JDBC table graph không thay function dependency analysis.

```powershell
python scripts/render_intrepid_schemaspy.py --database intrepid_correctness --port 55432
```

Nguồn công cụ: [SchemaSpy](https://github.com/schemaspy/schemaspy), [tbls](https://github.com/k1LoW/tbls). Phiên bản đã chạy và limitations xem [architecture regeneration](../../architecture/README.md) và tracking reports. Không giả vờ JSON được dump từ DB live.

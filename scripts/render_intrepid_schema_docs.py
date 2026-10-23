"""Render the validated Intrepid catalog into reviewable docs. No database access."""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[1];folder=root/'docs/intrepid-google-cloud';c=json.loads((folder/'catalog.validated.json').read_text(encoding='utf-8'))
descriptions={
'users':'Tài khoản nghiệp vụ và role; không chứa password/session của Identity Platform.',
'clients':'Doanh nghiệp sở hữu các lớp đào tạo.',
'courses':'Chương trình đào tạo, version và trạng thái phát hành.',
'classes':'Lần triển khai một khóa cho một doanh nghiệp/phòng ban.',
'learners':'Hồ sơ học viên gắn với user, mã học viên nghiệp vụ.',
'enrollments':'Ghi danh học viên vào lớp và trạng thái truy cập.',
'course_instructors':'Phân công giảng viên và permission trên khóa.',
'course_modules':'Các module trong khóa và thứ tự hiển thị.',
'lessons':'Codelab, tình huống, nội dung, prompt mẫu và trạng thái.',
'lesson_resources':'Học liệu/reference của một bài.',
'lesson_rubric_criteria':'Tiêu chí rubric và điểm tối đa.',
'lesson_progress':'Tiến độ học tập server-backed của học viên theo bài/lớp.',
'prompt_attempts':'Prompt, output, evaluation, model và thời gian từng lần thử.',
'rebuild_runs':'Request idempotency và snapshot chạy AI; giữ nguyên subject UUID.',
'rebuild_judge_claims':'Claim chấm điểm nhằm tránh chấm trùng/đồng thời.',
'rebuild_roster_imports':'Lịch sử/idempotency import roster.',
'rebuild_sop_documents':'Danh tính tài liệu SOP thuộc lớp.',
'rebuild_sop_versions':'Nội dung/version SOP; không ghi đè lịch sử.',
'rebuild_sop_bindings':'Gắn version SOP vào bài/lớp.',
'rebuild_trainer_actions':'Ghi chú/hành động can thiệp có bằng chứng.',
'workshop_messages':'Thông báo workshop theo lớp.',
'workshop_message_receipts':'Trạng thái nhận/đọc thông báo.',
'trainer_hints':'Coaching riêng theo học viên/lớp.',
'product_class_grants':'Quyền head/contributor theo lớp.',
'product_studio':'JSON config giáo trình, rubric, awards và revision.',
'product_session_controls':'Trạng thái active/frozen/ended của workshop.',
'product_sheet_connections':'Kết nối Google Sheet, mapping và trạng thái sync.',
'product_profile_corrections':'Yêu cầu sửa hồ sơ có trạng thái xử lý.',
'product_audit':'Audit nghiệp vụ theo người thao tác/lớp.',
'product_learner_support':'Lịch sử mở hint/solution/reflection.',
'product_roster_profiles':'Thông tin nhân sự bổ sung từ roster.',
'product_sandbox_runs':'Bằng chứng chạy/thử Judge trong authoring sandbox.',
'product_sop_contributions':'Đóng góp/yêu cầu SOP, review và metadata file.',
'product_sop_chunks':'Các đoạn SOP và embeddings gắn với version.',
'product_domains':'Domain được phép theo doanh nghiệp.',
'product_sync_logs':'Kết quả/lỗi/idempotency của đồng bộ roster.',
'product_governance_config':'Cấu hình governance singleton; cần review khi tách dữ liệu.',
'product_request_budgets':'Counters quota theo actor/operation/time bucket.',
'product_prompt_drafts':'Nháp prompt theo user/lớp/bài và revision.',
'product_enterprise_requests':'Yêu cầu B2B từ landing; dữ liệu lead, không mặc nhiên thuộc Intrepid.',
'product_worker_invocations':'Nonce chống replay của worker hiện tại.',
'product_attendance':'Điểm danh theo lớp/bài/học viên.',
'product_awards':'Record badge/certificate thật, issuer và evidence.',
'product_rotation_requests':'Yêu cầu rotation provider và audit deployment.',
'product_rotation_approvals':'Danh sách người phê duyệt rotation.',
'product_prompt_library':'Thư viện prompt cá nhân/chia sẻ và review status.',
'product_learner_context':'Context riêng do học viên upload, chunks và content hash.',
'user_tutorial_progress':'Trạng thái tutorial kế thừa; giữ để không mất tương thích.',
'gcp_identity_bindings':'BẢNG ĐỀ XUẤT MỚI: map issuer/external subject Google → user UUID và legacy auth subject UUID.'}
lines=['# Intrepid — Data dictionary đã dựng trên PostgreSQL','', 'Nguồn: schema gốc + migrations 002–049; không phải dump database live. 48 bảng nguồn + 1 bảng GCP đề xuất. Kiểu/default/constraints bên dưới lấy từ catalog PostgreSQL sau khi dựng candidate, không suy đoán từ TypeScript.','', '| Bảng | Mục đích | Cột |','|---|---|---|']
for t in c['tables']:
 name=t['tablename'];cols=[x for x in c['columns'] if x['table_name']==name];lines.append(f'| `{name}` | {descriptions[name]} | {len(cols)} |')
for t in c['tables']:
 name=t['tablename'];lines += ['',f'## {name}','',descriptions[name],'','| Cột | Kiểu PostgreSQL | Nullable | Default |','|---|---|---|---|']
 for x in c['columns']:
  if x['table_name']==name:lines.append(f"| `{x['column_name']}` | `{x['udt_name']}` | {x['is_nullable']} | `{(x['column_default'] or '—').replace('|','&#124;')}` |")
 lines += ['','Constraints:','']
 for k in c['constraints']:
  if k['table_name']==name:lines.append(f"- `{k['name']}`: `{k['definition']}`")
 lines += ['','Indexes:','']
 for x in c['indexes']:
  if x['tablename']==name:lines.append(f"- `{x['indexname']}`: `{x['indexdef']}`")
(folder/'DATA_DICTIONARY.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
# Build actual FK graph and parent-before-child load order.
edges=[];names={t['tablename'] for t in c['tables']}
for k in c['constraints']:
 if k['type']!='f':continue
 m=re.search(r'REFERENCES (?:public\.)?(\w+)\(([^)]+)\)',k['definition'])
 if m:edges.append({'child':k['table_name'],'parent':m[1],'constraint':k['name'],'definition':k['definition']})
pending=set(names);order=[]
while pending:
 ready=sorted(t for t in pending if not any(e['child']==t and e['parent'] in pending and e['parent']!=t for e in edges))
 if not ready:break
 order.extend(ready);pending.difference_update(ready)
(folder/'foreign-keys-and-load-order.json').write_text(json.dumps({'edges':edges,'load_order':order,'cycles_require_manual_review':sorted(pending)},indent=2),encoding='utf-8')
erd=['# Quan hệ dữ liệu Intrepid','', 'Quan hệ lấy từ foreign keys đã dựng. GCP identity bindings là bảng mới đề xuất. Không biểu diễn ngược cardinality nếu schema không xác nhận.','', '```mermaid','flowchart LR']
erd.extend(f'  {t}["{t}"]' for t in sorted(names));erd.extend(f"  {e['child']} --> {e['parent']}" for e in edges);erd += ['```',''];(folder/'RELATIONSHIPS.md').write_text('\n'.join(erd),encoding='utf-8')
lines=['# RPC, triggers và RLS','', 'Định nghĩa cuối cùng (bao gồm DO blocks cập nhật function) có trong catalog.validated.json. Auth shim trong schema auth là adapter GCP riêng.','', '| Function | Arguments | Return | SECURITY DEFINER |','|---|---|---|---|']
for f in c['functions']:lines.append(f"| `{f['name']}` | `{f['arguments']}` | `{f['result']}` | {f['security_definer']} |")
lines += ['','## Triggers','']
for t in c['triggers']:lines.append(f"- `{t['table_name']}.{t['name']}`: `{t['definition']}`")
lines += ['','## Chính sách RLS','', 'gcp_trusted_backend là quyền rộng của backend server-only, không phải quyền của learner. API phải giữ class/domain checks trước mọi query dùng service_role.','']
for p in c['policies']:lines.append(f"- `{p['tablename']}.{p['policyname']}` — {p['cmd']}; roles `{p['roles']}`; USING `{p['qual']}`; WITH CHECK `{p['with_check']}`")
(folder/'FUNCTIONS_AND_ACCESS.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
# Explicit target-only trigger suspension templates, not invoked automatically.
trigger_tables=sorted(set(t['table_name'] for t in c['triggers']))
(folder/'target-import-trigger-controls.sql').write_text('-- REVIEW ONLY. Target staging ONLY, migration owner, during controlled import.\n-- Do not run against source/live. Re-enable in the SAME controlled import workflow.\n-- No DISABLE TRIGGER ALL; internal FK constraints remain active.\n'+ '\n'.join(f'-- ALTER TABLE public.{t} DISABLE TRIGGER USER;' for t in trigger_tables)+'\n\n'+ '\n'.join(f'-- ALTER TABLE public.{t} ENABLE TRIGGER USER;' for t in trigger_tables)+'\n',encoding='utf-8')
print(f'Dictionary: {len(names)} tables, {len(edges)} FKs; load order {len(order)} tables, cycles {sorted(pending)}')

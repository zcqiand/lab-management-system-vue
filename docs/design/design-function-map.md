# 设计与功能对齐 — lab-management-system-vue

> 人填、人评审。机器只检查功能 ID 存在性。
> 回答一个问题：**这个功能子项，落到哪段代码、哪张表、哪个权限码上？**
> 答不上来的行，说明设计没做完，别开工。

## 映射表

| 功能子项 ID | 页面/组件 | 接口 | 数据表 | 权限码 | 设计稿 | 状态 |
|---|---|---|---|---|---|---|
| M01.F04.I02 | src/state/auth.ts (fetchPermissions) | GET /api/auth/permissions | – | M01.F04.I02 | – | 已上线 |
| M01.F04.I03 | src/state/require-auth.ts (useRequireAuth) | – (客户端守卫，无 API) | – | M01.F04.I03 | – | 已上线 |
| M01.F05.I02 | src/api/legacy-client.ts + src/api/http-client.ts | – (axios Bearer 拦截器) | – | M01.F05.I02 | – | 已上线 |
| M01.F05.I03 | src/pages/LoginPage.vue (SSO orchestrator) | GET /api/auth/sso/authorize ; POST /api/auth/sso/callback ; GET /api/auth/me | – | M01.F05.I03 | – | 已上线 |
| M01.F05.I04 | src/components/app/AppShell.vue (sidebar 退出登录 button) | POST /api/auth/logout | – | M01.F05.I04 | – | 已上线 |
| M02.F01.I01 | src/features/contracts/ContractsList.vue (table row) | GET /api/contracts | contracts | M02.F01.I01 | – | 已上线 |
| M02.F01.I02 | src/features/contracts/ContractsList.vue (新建 + 编辑) | POST /api/contracts ; PUT /api/contracts/:id | contracts | M02.F01.I02 | – | 已上线 |
| M02.F01.I03 | src/features/contracts/ContractsList.vue (行内 删除) | DELETE /api/contracts/:id | contracts | M02.F01.I03 | – | 已上线 |
| M03.F01.I01 | src/features/receipts/ReceiptsList.vue (table row) | GET /api/receipts?flowStatus=... | sample_receipts | M03.F01.I01 | – | 已上线 |
| M03.F01.I02 | src/features/receipts/ReceiptsList.vue (新建 / 编辑) | POST /api/receipts ; PUT /api/receipts/:id | sample_receipts | M03.F01.I02 | – | 已上线 |
| M03.F01.I03 | src/features/receipts/ReceiptsList.vue (行内 删除) | DELETE /api/receipts/:id | sample_receipts | M03.F01.I03 | – | 已上线 |
| M03.F01.I04 | src/features/receipts/ReceiptsList.vue (行内 提交) | POST /api/receipts/flow (action=submit) | sample_receipts | M03.F01.I04 | – | 已上线 |
| M03.F01.I07 | src/features/data-entry/SampleExtFieldsModal.vue + ReportPreviewModal.vue (弹窗) | PUT /api/samples/:id (ext JSON) | samples | M03.F01.I07 | – | 已上线 |
| M03.F02.I01 | src/features/task-assignment/TaskAssignmentList.vue (page header) | GET /api/receipts?flowStatus=task_assignment | sample_receipts | M03.F02.I01 | – | 已上线 |
| M03.F02.I02 | src/features/task-assignment/TaskAssignmentList.vue (行内 安排) | PUT /api/receipts/:id (assigneeName + plannedTestDate) | sample_receipts | M03.F02.I02 | – | 已上线 |
| M03.F03.I01 | src/features/data-entry/DataEntryPage.vue (page header) | GET /api/receipts?flowStatus=data_entry ; GET /api/samples ; GET /api/inspection-parameters ; GET /api/test-records | test_records | M03.F03.I01 | – | 已上线 |
| M03.F03.I02 | src/features/data-entry/DataEntryPage.vue (弹窗内 保存 button) | POST /api/test-records ; PUT /api/test-records/:id | test_records | M03.F03.I02 | – | 已上线 |
| M03.F03.I03 | src/features/data-entry/DataEntryPage.vue + models/ParticleGradationCard.vue + models/SoilCompactionCard.vue + models/SoilCompactionDegreeCard.vue (verdict 改判) | – (本地状态，进入 M03.F03.I02 save 时落库) | test_records | M03.F03.I03 | – | 已上线 |
| M03.F05.I01 | src/features/reports/ReportPhasePage.vue (via src/pages/ReportReviewPage.vue) | GET /api/receipts?flowStatus=review | sample_receipts | M03.F05.I01 | – | 已上线 |
| M03.F05.I02 | src/features/reports/ReportPhasePage.vue (批量 审核通过/退回) | POST /api/receipts/flow (action=submit/return) | sample_receipts | M03.F05.I02 | – | 已上线 |
| M03.F06.I01 | src/features/reports/ReportPhasePage.vue (via src/pages/ReportApprovePage.vue) | GET /api/receipts?flowStatus=approval | sample_receipts | M03.F06.I01 | – | 已上线 |
| M03.F06.I02 | src/features/reports/ReportPhasePage.vue (批量 批准通过/退回) | POST /api/receipts/flow (action=submit/return) | sample_receipts | M03.F06.I02 | – | 已上线 |
| M03.F07.I01 | src/features/reports/ReportPhasePage.vue (via src/pages/ReportIssuePage.vue) | GET /api/receipts?flowStatus=issuance | sample_receipts | M03.F07.I01 | – | 已上线 |
| M03.F07.I02 | src/features/reports/ReportPhasePage.vue (批量 发放/退回) | POST /api/receipts/flow (action=submit/return) | sample_receipts | M03.F07.I02 | – | 已上线 |
| M03.F08.I01 | src/features/reports/ReportPhasePage.vue (via src/pages/ReportArchivePage.vue) | GET /api/receipts?flowStatus=archived | sample_receipts | M03.F08.I01 | – | 已上线 |
| M03.F08.I02 | src/features/reports/ReportPhasePage.vue (批量 归档完成/退回) | POST /api/receipts/flow (action=submit/return) | sample_receipts | M03.F08.I02 | – | 已上线 |
| M03.F09.I01 | src/features/receipts/ReceiptDetail.vue (详情 card) | GET /api/receipts/:id | sample_receipts | M03.F09.I01 | – | 已上线 |
| M03.F09.I02 | src/features/receipts/ReceiptDetail.vue (流程历史 card) | GET /api/receipts/:id (含 flowHistory[]) | sample_receipts | M03.F09.I02 | – | 已上线 |
| M03.F09.I03 | src/features/receipts/ReceiptDetail.vue (报告预览 button) | – (本地渲染，复用缓存 receipt) | sample_receipts | M03.F09.I03 | – | 已上线 |
| M04.F06.I01 | src/pages/ModelsPage.vue → src/features/dicts/CategoryDictList.vue (table row) | GET /api/catalog/models?inspectionObjectCode=... ; GET /api/inspection-objects | inspection_models | M04.F06.I01 | – | 已上线 |
| M04.F06.I02 | src/pages/ModelsPage.vue → CategoryDictList.vue (新建 + 编辑) | POST /api/catalog/models ; PUT /api/catalog/models/:id | inspection_models | M04.F06.I02 | – | 已上线 |
| M04.F06.I03 | src/pages/ModelsPage.vue → CategoryDictList.vue (行内 删除) | DELETE /api/catalog/models/:id | inspection_models | M04.F06.I03 | – | 已上线 |
| M04.F07.I01 | src/pages/SpecificationsPage.vue → CategoryDictList.vue (table row) | GET /api/catalog/specs?inspectionObjectCode=... | inspection_specs | M04.F07.I01 | – | 已上线 |
| M04.F07.I02 | src/pages/SpecificationsPage.vue → CategoryDictList.vue (新建 + 编辑) | POST /api/catalog/specs ; PUT /api/catalog/specs/:id | inspection_specs | M04.F07.I02 | – | 已上线 |
| M04.F07.I03 | src/pages/SpecificationsPage.vue → CategoryDictList.vue (行内 删除) | DELETE /api/catalog/specs/:id | inspection_specs | M04.F07.I03 | – | 已上线 |
| M04.F08.I01 | src/pages/GradesPage.vue → CategoryDictList.vue (table row) | GET /api/catalog/grades?inspectionObjectCode=... | inspection_grades | M04.F08.I01 | – | 已上线 |
| M04.F08.I02 | src/pages/GradesPage.vue → CategoryDictList.vue (新建 + 编辑) | POST /api/catalog/grades ; PUT /api/catalog/grades/:id | inspection_grades | M04.F08.I02 | – | 已上线 |
| M04.F08.I03 | src/pages/GradesPage.vue → CategoryDictList.vue (行内 删除) | DELETE /api/catalog/grades/:id | inspection_grades | M04.F08.I03 | – | 已上线 |
| M04.F09.I01 | src/pages/BrandsPage.vue → CategoryDictList.vue (table row) | GET /api/catalog/brands?inspectionObjectCode=... | inspection_brands | M04.F09.I01 | – | 已上线 |
| M04.F09.I02 | src/pages/BrandsPage.vue → CategoryDictList.vue (新建 + 编辑) | POST /api/catalog/brands ; PUT /api/catalog/brands/:id | inspection_brands | M04.F09.I02 | – | 已上线 |
| M04.F09.I03 | src/pages/BrandsPage.vue → CategoryDictList.vue (行内 删除) | DELETE /api/catalog/brands/:id | inspection_brands | M04.F09.I03 | – | 已上线 |
| M05.F01.I01 | src/features/summary/SummaryList.vue (汇总表 root) | GET /api/summary?categoryCode=... ; GET /api/report-names (下拉) | sample_receipts | M05.F01.I01 | – | 已上线 |
| M05.F01.I02 | src/features/summary/SummaryList.vue (仪表盘卡片 grid) | GET /api/summary/stats | – (跨 sample_receipts/contracts 聚合) | M05.F01.I02 | – | 已上线 |
| M06.F01.I01 | src/pages/SpecialtiesPage.vue → src/features/inspection-capability/InspectionCapabilityList.vue (resource=specialties) | GET /api/inspection-specialties | inspection_specialty | M06.F01.I01 | – | 已上线 |
| M06.F02.I01 | src/pages/ObjectsPage.vue → InspectionCapabilityList.vue (resource=objects) | GET /api/inspection-objects?inspectionSpecialtyCode=... | inspection_object | M06.F02.I01 | – | 已上线 |
| M06.F02.I02 | src/pages/ObjectsPage.vue → InspectionCapabilityList.vue (form 选专项/参数) | POST /api/inspection-objects ; PUT /api/inspection-objects/:id | inspection_object | M06.F02.I02 | – | 已上线 |
| M06.F03.I01 | src/pages/ParametersPage.vue → InspectionCapabilityList.vue (resource=parameters) | GET /api/inspection-parameters?inspectionSpecialtyCode=...&inspectionObjectCode=...&inspectionStandardCode=... | inspection_parameter | M06.F03.I01 | – | 已上线 |
| M06.F03.I02 | src/features/inspection-capability/InspectionCapabilityList.vue + ParameterStandardLinkDialog.vue (parameters 行内 关联标准 toggle) | POST /api/inspection-standard-parameters ; DELETE 同 | inspection_parameter | M06.F03.I02 | – | 已上线 |
| M06.F04.I01 | src/pages/StandardsPage.vue → InspectionCapabilityList.vue (resource=standards) | GET /api/inspection-standards?inspectionSpecialtyCode=...&inspectionObjectCode=... | inspection_standard | M06.F04.I01 | – | 已上线 |
| M06.F04.I02 | src/pages/StandardsPage.vue → InspectionCapabilityList.vue (standards CRUD) | POST /api/inspection-standards ; PUT /api/inspection-standards/:id ; DELETE /api/inspection-standards/:id | inspection_standard | M06.F04.I02 | – | 已上线 |
| M06.F05.I01 | src/pages/CalculationRulesPage.vue → src/features/inspection-capability/CalculationRuleList.vue | GET /api/inspection-calculation-rules ; POST/PUT/DELETE 同 | inspection_calculation_rule | M06.F05.I01 | – | 已上线 |
| M06.F06.I01 | src/pages/TechnicalRequirementsPage.vue → src/features/inspection-capability/TechnicalRequirementList.vue | GET /api/inspection-technical-requirements | inspection_technical_requirement | M06.F06.I01 | – | 已上线 |
| M06.F06.I02 | src/features/inspection-capability/TechnicalRequirementList.vue (新建 + 编辑) | POST /api/inspection-technical-requirements ; PUT /api/inspection-technical-requirements/:id | inspection_technical_requirement | M06.F06.I02 | – | 已上线 |
| M06.F06.I03 | src/features/inspection-capability/TechnicalRequirementList.vue (行内 删除) | DELETE /api/inspection-technical-requirements/:id | inspection_technical_requirement | M06.F06.I03 | – | 已上线 |
| M06.F07.I01 | src/pages/ReportNamesPage.vue → src/features/report-names/ReportNameList.vue | GET /api/inspection-report-names ; POST/PUT/DELETE 同 | inspection_report_name | M06.F07.I01 | – | 已上线 |
| M06.F07.I02 | src/features/report-names/ReportNameList.vue + ReportNameLinkDialog.vue (行内 关联 button) | POST /api/inspection-report-name-standards ; DELETE 同 ; POST /api/inspection-report-name-parameters ; DELETE 同 | inspection_report_name_standard + inspection_report_name_parameter | M06.F07.I02 | – | 已上线 |
| M06.F08.I01 | src/pages/ParamInterfacesPage.vue → src/features/param-interfaces/ParamInterfaceList.vue | GET /api/inspection-param-interfaces ; POST/PUT/DELETE 同 | inspection_param_interface | M06.F08.I01 | – | 已上线 |
| M98.F01.I01 | src/components/app/BackendSwitcher.vue (dropdown trigger) | – (UI 下拉；useBackendStore) | – | M98.F01.I01 | – | 已上线 |
| M98.F01.I02 | src/components/app/BackendSwitcher.vue (edit baseUrl panel) | – (useBackendStore.setBaseUrl → localStorage) | – | M98.F01.I02 | – | 已上线 |
| M98.F02.I01 | src/components/app/BackendSwitcher.vue + src/api/http-client.ts (axios 拦截器) | – (axios Bearer 拦截器) | – | M98.F02.I01 | – | 已上线 |
| M98.F03.I01 | tests/endpoints-smoke.test.ts | – (validation: orval 端点函数存在性) | – | M98.F03.I01 | – | 已上线 |

## 约定

1. **权限码 = 功能子项 ID。** 前端按钮的权限判断直接写 ID。
2. 一个接口服务多个子项时，多行重复写。不要为表好看而合并 —— 合并后看不清接口还有没有别的调用方。
3. 状态列必须与功能清单一致。不一致以功能清单为准。

## 评审时问这三个问题

1. 有没有子项没有权限码？→ 那它就是任何人都能点的按钮
2. 有没有一张表被三个以上模块直接写入？→ 边界破了
3. 「开发中」的行里接口和表填了吗？→ 没填就是还在纸上，别报进度

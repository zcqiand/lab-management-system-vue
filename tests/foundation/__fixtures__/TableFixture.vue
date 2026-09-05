<script setup lang="ts">
// TableFixture — Phase 2a-1 底座冒烟测试的挂载靶子，**只给 tests/ 用**，
// 不被任何业务代码 import（不进 bundle）。
//
// 挂 6 个 Table 原语（Table / TableHeader / TableBody / TableRow / TableHead / TableCell），
// 钉住三条契约：
//   1. div-based + role 属性（语义等价 <table>/<thead>/<tbody>/<tr>/<th>/<td>）
//   2. $attrs 转发（TableRow 上的 data-fn 落到真实 <div>）
//   3. class prop 经 cn() 合并（调用方 class 压过默认；tailwind-merge）
import Table from "@/components/ui/Table.vue";
import TableHeader from "@/components/ui/TableHeader.vue";
import TableBody from "@/components/ui/TableBody.vue";
import TableRow from "@/components/ui/TableRow.vue";
import TableHead from "@/components/ui/TableHead.vue";
import TableCell from "@/components/ui/TableCell.vue";
</script>

<template>
  <Table data-testid="table-root">
    <TableHeader data-testid="table-header">
      <TableRow data-testid="header-row">
        <TableHead data-testid="th-name">名称</TableHead>
        <TableHead data-testid="th-value">值</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow
        data-testid="row-1"
        data-fn="M99.F99.I99"
        class="bg-warning/10"
      >
        <TableCell data-testid="cell-1-name">行 1</TableCell>
        <TableCell data-testid="cell-1-value">100</TableCell>
      </TableRow>
      <TableRow data-testid="row-2">
        <TableCell data-testid="cell-2-name">行 2</TableCell>
        <TableCell data-testid="cell-2-value">200</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>

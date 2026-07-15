// Sérialise et télécharge un CSV (séparateur ;, échappement RFC 4180, BOM UTF-8 pour Excel).
export function downloadCsv(headers: string[], rows: (string | number)[][], filename: string) {
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

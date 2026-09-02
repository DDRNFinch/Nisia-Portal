from pathlib import Path

path = Path('src/main.jsx')
text = path.read_text(encoding='utf-8')

start_marker = 'function courseEvidenceCounts(rows) {'
end_marker = '\nasync function fetchCourseMappingJson(url) {'
start = text.find(start_marker)
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit('Expected Nisia progress inference block was not found')

replacement = '''function completedCourseEvidencePaths(evidenceRows) {
  const completed = new Set()

  for (const row of evidenceRows || []) {
    const metadata = row?.source_metadata && typeof row.source_metadata === 'object' ? row.source_metadata : {}
    if (cleanCourseProgressValue(metadata.source).toLowerCase() !== 'evia') continue
    if (metadata.area_complete !== true) continue
    const key = courseEvidencePathKey(metadata.path)
    if (key !== '[]') completed.add(key)
  }

  return completed
}
'''

text = text[:start] + replacement + text[end:]

for forbidden in ['function courseEvidenceCounts(rows)', 'function courseEvidenceMethodSatisfied(label, rows)']:
    if forbidden in text:
        raise SystemExit(f'Obsolete progress inference remains: {forbidden}')
if 'metadata.area_complete !== true' not in text:
    raise SystemExit('Explicit Evia completion marker was not installed')
if 'const completedPaths = completedCourseEvidencePaths(evidenceRows || [])' not in text:
    raise SystemExit('Course progress no longer calls the completion source')

path.write_text(text, encoding='utf-8')
print('Nisia now uses Evia explicit area completion state')

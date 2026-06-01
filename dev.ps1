# Local dev launcher — sets test-adapter env vars so the app runs without
# a real Copilot CLI binary installed.
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) "concierge-dev-$([System.IO.Path]::GetRandomFileName())"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

$stub = '{"identity":{"login":"dev-user","displayName":"Dev User"},"repositories":[]}'
Set-Content -Path "$tmp\gh-adapter.json"      -Value $stub
Set-Content -Path "$tmp\copilot-adapter.json" -Value '{"ok":true}'
Set-Content -Path "$tmp\acp-adapter.json"     -Value '{"ok":true}'

$env:CONCIERGE_TEST_GH_ADAPTER      = "$tmp\gh-adapter.json"
$env:CONCIERGE_TEST_COPILOT_ADAPTER = "$tmp\copilot-adapter.json"
$env:CONCIERGE_TEST_ACP_ADAPTER     = "$tmp\acp-adapter.json"

try {
    npm run dev
} finally {
    Remove-Item -Recurse -Force $tmp
}

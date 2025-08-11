$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

if (-not ([System.Management.Automation.PSTypeName]'U32').Type) {
  Add-Type -Language CSharp -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class U32 {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll", SetLastError=true)] public static extern int GetWindowTextLength(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
'@
}

$wins = New-Object System.Collections.Generic.List[object]
$null = [U32]::EnumWindows([U32+EnumWindowsProc]{
  param([IntPtr] $hWnd,[IntPtr] $lParam)
  if (-not [U32]::IsWindowVisible($hWnd)) { return $true }
  $len = [U32]::GetWindowTextLength($hWnd); if ($len -le 0) { return $true }
  $sb = New-Object System.Text.StringBuilder ($len + 1)
  [void][U32]::GetWindowText($hWnd, $sb, $sb.Capacity)
  $title = $sb.ToString(); if ([string]::IsNullOrWhiteSpace($title)) { return $true }
  [U32+RECT] $rect = New-Object U32+RECT
  [void][U32]::GetWindowRect($hWnd, [ref]$rect)
  $wins.Add([PSCustomObject]@{
    hwnd=[int]$hWnd; title=$title
    left=$rect.Left; top=$rect.Top
    width=$rect.Right-$rect.Left; height=$rect.Bottom-$rect.Top
  }) | Out-Null
  return $true
}, [IntPtr]::Zero)

# optional: filter out minimized/offscreen
$wins = $wins | Where-Object { $_.width -gt 100 -and $_.height -gt 100 -and $_.left -gt -32000 -and $_.top -gt -32000 }

$wins | ConvertTo-Json -Depth 3 -Compress

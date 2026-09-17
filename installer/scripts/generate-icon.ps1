Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\..\ICON.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "ICON.png not found at $srcPath"
    exit 1
}

$src = [System.Drawing.Bitmap]::FromFile((Resolve-Path $srcPath))
$sizes = @(256, 128, 64, 48, 32, 16)
$pngStreams = @()

foreach ($sz in $sizes) {
    $dest = New-Object System.Drawing.Bitmap($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $sz, $sz)
    $g.Dispose()
    
    $ms = New-Object System.IO.MemoryStream
    $dest.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $dest.Dispose()
    $pngStreams += $ms
}
$src.Dispose()

$assetsDir = Join-Path $PSScriptRoot "..\assets"
if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
}
$outPath = Join-Path $assetsDir "icon.ico"
$fs = [System.IO.File]::Create($outPath)
$bw = New-Object System.IO.BinaryWriter($fs)

# ICONDIR header
$bw.Write([uint16]0) # Reserved
$bw.Write([uint16]1) # Type 1 = ICO
$bw.Write([uint16]$sizes.Count)

# Calculate offset: Header (6) + DirEntries (16 * count)
$offset = 6 + (16 * $sizes.Count)

for ($i = 0; $i -lt $sizes.Count; $i++) {
    $sz = $sizes[$i]
    $bytes = $pngStreams[$i].ToArray()
    $w = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $h = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $bw.Write($w)
    $bw.Write($h)
    $bw.Write([byte]0) # Color count
    $bw.Write([byte]0) # Reserved
    $bw.Write([uint16]1) # Color planes
    $bw.Write([uint16]32) # Bits per pixel
    $bw.Write([uint32]$bytes.Length)
    $bw.Write([uint32]$offset)
    $offset += $bytes.Length
}

for ($i = 0; $i -lt $sizes.Count; $i++) {
    $bytes = $pngStreams[$i].ToArray()
    $bw.Write($bytes)
    $pngStreams[$i].Dispose()
}

$bw.Close()
$fs.Close()

# Also copy ICON.png to assets and public/dist
Copy-Item $srcPath -Destination (Join-Path $assetsDir "icon.png") -Force
$publicDir = Join-Path $PSScriptRoot "..\..\public"
Copy-Item $srcPath -Destination (Join-Path $publicDir "icon.png") -Force
Copy-Item $srcPath -Destination (Join-Path $publicDir "ICON.png") -Force
Copy-Item $outPath -Destination (Join-Path $publicDir "favicon.ico") -Force

Write-Host "icon.ico generated successfully at $outPath"

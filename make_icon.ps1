Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile('C:\Users\kpasc\source\repos\crazyjam_repo\src\assets\images\CrazyJam-Icon-logo-1.png')
$size = 512
$canvas = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($canvas)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::Transparent)

$scale = [Math]::Min($size / $src.Width, $size / $src.Height) * 0.88
$newW = [int]($src.Width * $scale)
$newH = [int]($src.Height * $scale)
$x = [int](($size - $newW) / 2)
$y = [int](($size - $newH) / 2)
$g.DrawImage($src, $x, $y, $newW, $newH)

$outPath = 'C:\Users\kpasc\source\repos\crazyjam_repo\electron\icon.png'
$canvas.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$canvas.Dispose()
$src.Dispose()
Write-Output "done: $outPath"

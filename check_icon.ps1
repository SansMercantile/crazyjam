Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('C:\Users\kpasc\source\repos\crazyjam_repo\src\assets\images\CrazyJam-Icon-logo-1.png')
Write-Output ($img.Width.ToString() + 'x' + $img.Height.ToString())
$img.Dispose()

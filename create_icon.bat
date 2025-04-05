@echo off
echo Creating basic application icon...

REM Create assets directory if it doesn't exist
if not exist assets mkdir assets

REM Create a PowerShell script to generate the icon
echo $iconFile = Join-Path $PSScriptRoot "assets\icon.ico" > createicon.ps1
echo $iconSize = New-Object System.Drawing.Size(256, 256) >> createicon.ps1
echo $bmp = New-Object System.Drawing.Bitmap($iconSize.Width, $iconSize.Height) >> createicon.ps1
echo $g = [System.Drawing.Graphics]::FromImage($bmp) >> createicon.ps1
echo $g.Clear([System.Drawing.Color]::White) >> createicon.ps1
echo $font = New-Object System.Drawing.Font("Arial", 120, [System.Drawing.FontStyle]::Bold) >> createicon.ps1
echo $brush = [System.Drawing.Brushes]::DodgerBlue >> createicon.ps1
echo $text = "OCR" >> createicon.ps1
echo $stringFormat = New-Object System.Drawing.StringFormat >> createicon.ps1
echo $stringFormat.Alignment = [System.Drawing.StringAlignment]::Center >> createicon.ps1
echo $stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center >> createicon.ps1
echo $rect = New-Object System.Drawing.RectangleF(0, 0, $bmp.Width, $bmp.Height) >> createicon.ps1
echo $g.DrawString($text, $font, $brush, $rect, $stringFormat) >> createicon.ps1
echo $iconStream = New-Object System.IO.MemoryStream >> createicon.ps1
echo $bmp.Save($iconStream, [System.Drawing.Imaging.ImageFormat]::Png) >> createicon.ps1
echo $iconStream.Position = 0 >> createicon.ps1
echo Add-Type -AssemblyName System.Drawing >> createicon.ps1
echo $icon = [System.Drawing.Icon]::FromHandle(([System.Drawing.Bitmap]::new($iconStream)).GetHicon()) >> createicon.ps1
echo $fileStream = [System.IO.File]::Create($iconFile) >> createicon.ps1
echo $icon.Save($fileStream) >> createicon.ps1
echo $fileStream.Close() >> createicon.ps1
echo $icon.Dispose() >> createicon.ps1
echo $g.Dispose() >> createicon.ps1
echo $bmp.Dispose() >> createicon.ps1
echo Write-Output "Icon created at $iconFile" >> createicon.ps1

REM Run the PowerShell script
powershell -ExecutionPolicy Bypass -File createicon.ps1

REM Clean up
del createicon.ps1

echo.
echo Icon created successfully in the assets folder.
echo.
pause 
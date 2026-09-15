# installer/assets

Place the application icon here before building the installer:

**Required file:**

```
installer/assets/icon.ico
```

- Format: Windows `.ico`
- Recommended sizes embedded: 256×256, 128×128, 64×64, 48×48, 32×32, 16×16
- This icon is used for:
  - The installer wizard
  - The Start Menu shortcut
  - The Desktop shortcut
  - The launcher `.exe` (via Inno Setup)

**Creating a quick icon (free tools):**

1. Use [IcoFX](https://icofx.ro/) or [GIMP](https://www.gimp.org/) to convert a PNG to ICO
2. Or use the free online converter: https://convertio.co/png-ico/
3. Save the result as `installer/assets/icon.ico`

If you skip this step the build will fail at the Inno Setup stage with:
```
Fatal: Cannot open icon file "...installer\assets\icon.ico"
```

To build without a custom icon, edit `installer/inno/setup.iss` and
remove or comment out the `SetupIconFile=` and `UninstallDisplayIcon=` lines.

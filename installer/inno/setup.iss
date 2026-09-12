; ============================================================================
; Residential Masterlist — Inno Setup Script
; ============================================================================
; Prerequisites (must exist before running iscc.exe against this file):
;   dist\app\              — Next.js standalone build
;   dist\runtime\node.exe  — Node.js v18 Windows x64 standalone binary
;   dist\runtime\mysql\    — MariaDB 10.11 portable (Windows x64)
;   dist\launcher\launcher.exe — compiled launcher (pkg)
;   dist\scripts\          — db-init.js + node_modules
;   dist\database\schema.sql
;   installer\assets\icon.ico  (application icon — 256x256)
; ============================================================================

#define AppName        "Residential Masterlist"
#define AppVersion     "1.0.0"
#define AppPublisher   "Eru Studio"
#define AppURL         "http://127.0.0.1:3000"
#define AppExeName     "launcher.exe"
#define ServiceName    "RMLauncher"
; Root of the prepared dist tree (relative to this .iss file location)
#define DistDir        "..\..\dist"

[Setup]
AppId={{F2A8C3D1-7B4E-4F9A-8C2D-1E5B3F7A9C0D}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppCopyright=Copyright (C) Eru Studio
VersionInfoCompany=Eru Studio
VersionInfoDescription=Residential Masterlist Setup
VersionInfoVersion=1.0.0.0
VersionInfoCopyright=Copyright (C) Eru Studio
VersionInfoProductName=Residential Masterlist
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
AllowNoIcons=no
; Installer output
OutputDir="C:\Users\jhude\Downloads\Compressed\residential-masterlist-main\residential-masterlist-main\dist"
OutputBaseFilename=ResidentialMasterlistSetup
; Compression
Compression=lzma2/ultra64
SolidCompression=yes
; Privileges — need admin to write to Program Files + ProgramData
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=
; Visual
WizardStyle=modern
SetupIconFile=..\assets\icon.ico
UninstallDisplayIcon={app}\launcher\icon.ico
; Architecture
ArchitecturesInstallIn64BitMode=x64compatible
; Minimum OS: Windows 10
MinVersion=10.0.17763

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon";  Description: "Create a &desktop shortcut";      GroupDescription: "Additional icons:"; Flags: unchecked
Name: "startupicon";  Description: "Start with &Windows (auto-launch)";GroupDescription: "Additional icons:"; Flags: unchecked

[Files]
; Application (Next.js standalone)
Source: "{#DistDir}\app\*";          DestDir: "{app}\app";          Flags: ignoreversion recursesubdirs createallsubdirs

; Node.js runtime
Source: "{#DistDir}\runtime\node.exe";  DestDir: "{app}\runtime";   Flags: ignoreversion

; MariaDB portable
Source: "{#DistDir}\runtime\mysql\*";   DestDir: "{app}\runtime\mysql"; Flags: ignoreversion recursesubdirs createallsubdirs

; Compiled launcher EXE and icon assets
Source: "{#DistDir}\launcher\launcher.exe"; DestDir: "{app}\launcher"; Flags: ignoreversion
Source: "{#DistDir}\launcher\icon.ico";     DestDir: "{app}\launcher"; Flags: ignoreversion
Source: "{#DistDir}\launcher\icon.png";     DestDir: "{app}\launcher"; Flags: ignoreversion

; Node-based scripts (db-init, etc.) with their node_modules
Source: "{#DistDir}\scripts\*";      DestDir: "{app}\scripts";      Flags: ignoreversion recursesubdirs createallsubdirs

; Database schema
Source: "{#DistDir}\database\schema.sql"; DestDir: "{app}\database"; Flags: ignoreversion

[Dirs]
; Create persistent data directories — never deleted on uninstall
Name: "{commonappdata}\ResidentialMasterlist";           Permissions: everyone-full
Name: "{commonappdata}\ResidentialMasterlist\data";      Permissions: everyone-full
Name: "{commonappdata}\ResidentialMasterlist\uploads";   Permissions: everyone-full
Name: "{commonappdata}\ResidentialMasterlist\logs";      Permissions: everyone-full
Name: "{commonappdata}\ResidentialMasterlist\backups";   Permissions: everyone-full

[INI]
; Nothing — we write app.env via [Run] section below

[Icons]
; Start Menu
Name: "{group}\{#AppName}";              Filename: "{app}\launcher\{#AppExeName}"; WorkingDir: "{app}\launcher"; IconFilename: "{app}\launcher\icon.ico"
Name: "{group}\Uninstall {#AppName}";    Filename: "{uninstallexe}"; IconFilename: "{app}\launcher\icon.ico"

; Desktop shortcut (optional task)
Name: "{autodesktop}\{#AppName}";        Filename: "{app}\launcher\{#AppExeName}"; WorkingDir: "{app}\launcher"; IconFilename: "{app}\launcher\icon.ico"; Tasks: desktopicon

; Startup shortcut (optional task) — uses common startup so it works under admin install
Name: "{commonstartup}\{#AppName}";       Filename: "{app}\launcher\{#AppExeName}"; WorkingDir: "{app}\launcher"; IconFilename: "{app}\launcher\icon.ico"; Tasks: startupicon

[Run]
Filename: "{app}\launcher\{#AppExeName}"; Description: "Launch {#AppName}"; Flags: nowait postinstall skipifsilent

[Code]
// ---------------------------------------------------------------------------
// Write app.env to ProgramData at the end of installation
// ---------------------------------------------------------------------------
procedure WriteAppEnv();
var
  EnvPath : String;
  Content : String;
begin
  EnvPath := ExpandConstant('{commonappdata}\ResidentialMasterlist\app.env');
  // Only write if not already present (preserve existing install config)
  if not FileExists(EnvPath) then
  begin
    Content :=
      '# Residential Masterlist — Runtime Configuration' + #13#10 +
      '# Generated by installer. Edit carefully.' + #13#10 +
      '#' + #13#10 +
      'DB_HOST=127.0.0.1' + #13#10 +
      'DB_PORT=33060' + #13#10 +
      'DB_NAME=residential_masterlist' + #13#10 +
      'DB_USER=rml_app' + #13#10 +
      'DB_PASSWORD=RML@localhost#2024' + #13#10 +
      'DB_CONNECTION_LIMIT=10' + #13#10 +
      'APP_PORT=3000' + #13#10 +
      'COOKIE_SECURE=false' + #13#10;
    SaveStringToFile(EnvPath, Content, False);
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
    WriteAppEnv();
end;

// ---------------------------------------------------------------------------
// On uninstall: ask whether to keep user data
// ---------------------------------------------------------------------------
function InitializeUninstall(): Boolean;
var
  Answer : Integer;
begin
  Result := True;
  Answer := MsgBox(
    'Do you want to keep your database and homeowner records?' + Chr(13)+Chr(10) +
    Chr(13)+Chr(10) +
    'Click YES to keep all data in:' + Chr(13)+Chr(10) +
    '  ' + ExpandConstant('{commonappdata}') + '\ResidentialMasterlist' + Chr(13)+Chr(10) +
    Chr(13)+Chr(10) +
    'Click NO to permanently delete all homeowner data.' + Chr(13)+Chr(10) +
    '(This cannot be undone!)',
    mbConfirmation,
    MB_YESNO
  );
  // Store decision in registry for the uninstall step
  if Answer = IDNO then
    RegWriteStringValue(HKLM, 'Software\ResidentialMasterlist', 'DeleteData', '1')
  else
    RegWriteStringValue(HKLM, 'Software\ResidentialMasterlist', 'DeleteData', '0');
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  DeleteData : String;
  DataDir    : String;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    RegQueryStringValue(HKLM, 'Software\ResidentialMasterlist', 'DeleteData', DeleteData);
    if DeleteData = '1' then
    begin
      DataDir := ExpandConstant('{commonappdata}') + '\ResidentialMasterlist';
      if DirExists(DataDir) then
        DelTree(DataDir, True, True, True);
    end;
    RegDeleteKeyIncludingSubkeys(HKLM, 'Software\ResidentialMasterlist');
  end;
end;

[UninstallDelete]
; Only delete program files — NOT ProgramData unless user said so (handled in [Code])
Type: filesandordirs; Name: "{app}"

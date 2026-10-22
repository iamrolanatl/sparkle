# Windows Credential Manager (DPAPI-protected, per-user) helper for the Sparkle sync agent.
#   cred.ps1 read  <target>            -> writes the secret to stdout (consumed by node, never logged)
#   cred.ps1 write <target> <file>     -> stores the file's content as the secret, then deletes the file
param([string]$Mode, [string]$Target, [string]$File)
$ErrorActionPreference = "Stop"
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices; using System.Text;
public static class SparkleCred {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct CREDENTIAL { public int Flags; public int Type; public string TargetName; public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten; public int CredentialBlobSize; public IntPtr CredentialBlob;
    public int Persist; public int AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName; }
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CredReadW(string t, int type, int f, out IntPtr c);
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CredWriteW(ref CREDENTIAL c, int f);
  [DllImport("advapi32.dll")] static extern void CredFree(IntPtr p);
  public static string Read(string t) { IntPtr p; if (!CredReadW(t, 1, 0, out p)) return null;
    var c = (CREDENTIAL)Marshal.PtrToStructure(p, typeof(CREDENTIAL)); var s = Marshal.PtrToStringUni(c.CredentialBlob, c.CredentialBlobSize / 2); CredFree(p); return s; }
  public static void Write(string t, string secret) { var b = Encoding.Unicode.GetBytes(secret); var c = new CREDENTIAL();
    c.Type = 1; c.TargetName = t; c.UserName = "sparkle-sync"; c.Persist = 2; c.CredentialBlobSize = b.Length; c.CredentialBlob = Marshal.AllocHGlobal(b.Length);
    Marshal.Copy(b, 0, c.CredentialBlob, b.Length); try { if (!CredWriteW(ref c, 0)) throw new Exception("CredWrite failed " + Marshal.GetLastWin32Error()); } finally { Marshal.FreeHGlobal(c.CredentialBlob); } }
}
"@
if ($Mode -eq "read") { $s = [SparkleCred]::Read($Target); if ($null -eq $s) { exit 2 }; [Console]::Out.Write($s) }
elseif ($Mode -eq "write") { [SparkleCred]::Write($Target, (Get-Content -Raw $File).Trim()); Remove-Item -Force $File; "stored" }
else { exit 1 }

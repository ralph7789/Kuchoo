<#
.SYNOPSIS
Resets user access to a calendar folder and grants Owner permissions.

.DESCRIPTION
This script connects to Exchange Online, removes the specified user's permissions on the target mailbox's Calendar folder, and then re-adds them with Owner permissions.

.PARAMETER Mailbox
The primary SMTP address of the target mailbox whose calendar is being accessed.

.PARAMETER User
The primary SMTP address of the user whose permissions are being reset.
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory=$true)]
    [string]$Mailbox,

    [Parameter(Mandatory=$true)]
    [string]$User
)

# Check if Exchange Online module is installed
if (-not (Get-Module -ListAvailable -Name ExchangeOnlineManagement)) {
    Write-Warning "ExchangeOnlineManagement module is missing. Please install it using: Install-Module -Name ExchangeOnlineManagement -Force"
    Exit
}

# Connect to Exchange Online if not already connected
$currentConnection = Get-ConnectionInformation -ErrorAction SilentlyContinue
if ($null -eq $currentConnection) {
    Write-Output "Connecting to Exchange Online..."
    Connect-ExchangeOnline -ShowProgress $false
}

$calendarPath = "$Mailbox:\Calendar"

Write-Output "Removing existing permissions for $User on $calendarPath..."
# Use ErrorAction SilentlyContinue in case the user doesn't have permissions yet
Remove-MailboxFolderPermission -Identity $calendarPath -User $User -Confirm:$false -ErrorAction SilentlyContinue

Write-Output "Granting Owner permissions to $User on $calendarPath..."
Add-MailboxFolderPermission -Identity $calendarPath -User $User -AccessRights Owner

Write-Output "Access redeployed successfully."

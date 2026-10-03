import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

// Handle, service and text are passed as argv, never spliced into the script, so a
// farmer's message cannot inject AppleScript.
const SEND_SCRIPT = `
on run argv
  set targetHandle to item 1 of argv
  set targetService to item 2 of argv
  set messageText to item 3 of argv
  tell application "Messages"
    if targetService is "iMessage" then
      set targetAccount to 1st account whose service type = iMessage
    else
      set targetAccount to 1st account whose service type = SMS
    end if
    send messageText to participant targetHandle of targetAccount
  end tell
end run`;

export async function sendWithMessagesApp(handle: string, service: string, text: string): Promise<void> {
  await run("osascript", ["-e", SEND_SCRIPT, handle, service, text], { timeout: 20_000 });
}

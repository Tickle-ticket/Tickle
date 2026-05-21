const fs = require('fs');
const path = require('path');

const logFilePath = 'c:\\Users\\gyqls\\.gemini\\antigravity\\brain\\3363411c-eec7-43f8-855c-4cb1751086c0\\.system_generated\\logs\\overview.txt';
const workspacePath = 'c:\\Users\\gyqls\\OneDrive\\바탕 화면\\S14P31A203';

if (!fs.existsSync(logFilePath)) {
  console.error('Log file not found.');
  process.exit(1);
}

const lines = fs.readFileSync(logFilePath, 'utf-8').split('\n');
const fileContents = {};

for (const line of lines) {
  if (line.includes('"name":"write_to_file"') || line.includes('"name":"replace_file_content"') || line.includes('"name":"multi_replace_file_content"')) {
    try {
      // Find JSON object
      const jsonStart = line.indexOf('{');
      if (jsonStart === -1) continue;
      
      const jsonStr = line.substring(jsonStart);
      const logEntry = JSON.parse(jsonStr);
      
      if (logEntry.created_at && logEntry.created_at >= '2026-04-27T12:26:00Z') {
        // Stop parsing after the hard reset incident
        break;
      }

      if (logEntry.tool_calls) {
        for (const call of logEntry.tool_calls) {
          if (call.name === 'write_to_file') {
            const targetFile = JSON.parse(call.args.TargetFile);
            const content = JSON.parse(call.args.CodeContent);
            fileContents[targetFile] = content;
          } else if (call.name === 'replace_file_content') {
            // It's harder to perfectly apply replace_file_content without the original base file,
            // but we can track that it was modified.
            // For full recovery, usually write_to_file is what we need if the agent rewrote the file.
          }
        }
      }
    } catch (e) {
      // Ignore parse errors for malformed lines
    }
  }
}

let recoveredCount = 0;
for (const [filePath, content] of Object.entries(fileContents)) {
  if (filePath.includes('node_modules') || filePath.includes('.git')) continue;
  
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Recovered: ${filePath}`);
    recoveredCount++;
  } catch (err) {
    console.error(`Failed to write: ${filePath}`);
  }
}

console.log(`\nTotal ${recoveredCount} files recovered from logs.`);

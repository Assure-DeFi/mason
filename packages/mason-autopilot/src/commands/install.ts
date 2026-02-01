/**
 * mason-autopilot install
 *
 * Install autopilot as a system service that survives reboot.
 * Supports macOS (launchd), Linux (systemd), and Windows (Task Scheduler).
 */

import { execSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
} from 'node:fs';
import { homedir, platform } from 'node:os';
import { join, dirname } from 'node:path';

const CONFIG_DIR = join(homedir(), '.mason');
const CONFIG_FILE = join(CONFIG_DIR, 'autopilot.json');

interface AutopilotConfig {
  repositoryPath: string;
}

export async function installCommand(): Promise<void> {
  console.log('\nMason Autopilot - System Service Installation\n');

  // Check if configured
  if (!existsSync(CONFIG_FILE)) {
    console.error('Autopilot not configured. Run: mason-autopilot init');
    process.exit(1);
  }

  const config = JSON.parse(
    readFileSync(CONFIG_FILE, 'utf-8'),
  ) as AutopilotConfig;
  const os = platform();

  switch (os) {
    case 'darwin':
      await installMacOS(config);
      break;
    case 'linux':
      await installLinux(config);
      break;
    case 'win32':
      await installWindows(config);
      break;
    default:
      console.error(`Unsupported platform: ${os}`);
      console.log('\nYou can run the daemon manually with:');
      console.log('  mason-autopilot start');
      process.exit(1);
  }
}

async function installMacOS(config: AutopilotConfig): Promise<void> {
  console.log('Installing as macOS launchd service...\n');

  const plistPath = join(
    homedir(),
    'Library',
    'LaunchAgents',
    'com.assuredefi.mason-autopilot.plist',
  );
  const plistDir = dirname(plistPath);

  // Find mason-autopilot binary path
  let binaryPath: string;
  try {
    binaryPath = execSync('which mason-autopilot', {
      encoding: 'utf-8',
    }).trim();
  } catch {
    binaryPath = join(process.cwd(), 'node_modules', '.bin', 'mason-autopilot');
    if (!existsSync(binaryPath)) {
      console.error(
        'Could not find mason-autopilot binary. Make sure it is installed globally:',
      );
      console.log('  npm install -g mason-autopilot');
      process.exit(1);
    }
  }

  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.assuredefi.mason-autopilot</string>
    <key>ProgramArguments</key>
    <array>
        <string>${binaryPath}</string>
        <string>start</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${config.repositoryPath}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${CONFIG_DIR}/autopilot.log</string>
    <key>StandardErrorPath</key>
    <string>${CONFIG_DIR}/autopilot.error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>${homedir()}/.local/bin:${homedir()}/.nvm/versions/node/v24.12.0/bin:/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
    </dict>
</dict>
</plist>`;

  // Create LaunchAgents directory if needed
  if (!existsSync(plistDir)) {
    mkdirSync(plistDir, { recursive: true });
  }

  writeFileSync(plistPath, plistContent);
  console.log(`Created: ${plistPath}`);

  // Load the service
  try {
    // Unload first if exists
    try {
      execSync(`launchctl unload "${plistPath}" 2>/dev/null`, {
        stdio: 'ignore',
      });
    } catch {
      // Ignore if not loaded
    }

    execSync(`launchctl load "${plistPath}"`);
    console.log('\nService installed and started!');
    console.log('\nUseful commands:');
    console.log(`  launchctl list | grep mason          # Check status`);
    console.log(`  launchctl unload "${plistPath}"      # Stop service`);
    console.log(`  launchctl load "${plistPath}"        # Start service`);
    console.log(`  tail -f ${CONFIG_DIR}/autopilot.log  # View logs`);
  } catch (error) {
    console.error('Failed to load service:', error);
    console.log('\nTry loading manually:');
    console.log(`  launchctl load "${plistPath}"`);
  }
}

async function installLinux(config: AutopilotConfig): Promise<void> {
  console.log('Installing as systemd user service...\n');

  const serviceDir = join(homedir(), '.config', 'systemd', 'user');
  const servicePath = join(serviceDir, 'mason-autopilot.service');

  // Find mason-autopilot binary path
  let binaryPath: string;
  try {
    binaryPath = execSync('which mason-autopilot', {
      encoding: 'utf-8',
    }).trim();
  } catch {
    binaryPath = join(process.cwd(), 'node_modules', '.bin', 'mason-autopilot');
    if (!existsSync(binaryPath)) {
      console.error(
        'Could not find mason-autopilot binary. Make sure it is installed globally:',
      );
      console.log('  npm install -g mason-autopilot');
      process.exit(1);
    }
  }

  const serviceContent = `[Unit]
Description=Mason Autopilot Daemon
After=network.target

[Service]
Type=simple
ExecStart=${binaryPath} start
WorkingDirectory=${config.repositoryPath}
Restart=always
RestartSec=10
StandardOutput=append:${CONFIG_DIR}/autopilot.log
StandardError=append:${CONFIG_DIR}/autopilot.error.log
Environment="PATH=${homedir()}/.local/bin:${homedir()}/.nvm/versions/node/v24.12.0/bin:/usr/local/bin:/usr/bin:/bin"

[Install]
WantedBy=default.target
`;

  // Create systemd user directory if needed
  if (!existsSync(serviceDir)) {
    mkdirSync(serviceDir, { recursive: true });
  }

  writeFileSync(servicePath, serviceContent);
  console.log(`Created: ${servicePath}`);

  // Reload and enable the service
  try {
    execSync('systemctl --user daemon-reload');
    execSync('systemctl --user enable mason-autopilot');
    execSync('systemctl --user start mason-autopilot');

    console.log('\nService installed and started!');
    console.log('\nUseful commands:');
    console.log('  systemctl --user status mason-autopilot  # Check status');
    console.log('  systemctl --user stop mason-autopilot    # Stop service');
    console.log('  systemctl --user start mason-autopilot   # Start service');
    console.log('  journalctl --user -u mason-autopilot     # View logs');
    console.log(`  tail -f ${CONFIG_DIR}/autopilot.log      # View logs`);
  } catch (error) {
    console.error('Failed to install service:', error);
    console.log('\nTry running manually:');
    console.log('  systemctl --user daemon-reload');
    console.log('  systemctl --user enable mason-autopilot');
    console.log('  systemctl --user start mason-autopilot');
  }
}

async function installWindows(config: AutopilotConfig): Promise<void> {
  console.log('Installing as Windows Task Scheduler task...\n');

  // Find mason-autopilot binary path
  let binaryPath: string;
  try {
    binaryPath = execSync('where mason-autopilot', { encoding: 'utf-8' })
      .trim()
      .split('\n')[0];
  } catch {
    binaryPath = join(
      process.cwd(),
      'node_modules',
      '.bin',
      'mason-autopilot.cmd',
    );
    if (!existsSync(binaryPath)) {
      console.error(
        'Could not find mason-autopilot binary. Make sure it is installed globally:',
      );
      console.log('  npm install -g mason-autopilot');
      process.exit(1);
    }
  }

  // Create XML for Task Scheduler
  const xmlPath = join(CONFIG_DIR, 'mason-autopilot-task.xml');
  const xmlContent = `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Mason Autopilot Daemon</Description>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>7</Priority>
    <RestartOnFailure>
      <Interval>PT1M</Interval>
      <Count>3</Count>
    </RestartOnFailure>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>${binaryPath}</Command>
      <Arguments>start</Arguments>
      <WorkingDirectory>${config.repositoryPath}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>`;

  writeFileSync(xmlPath, xmlContent, { encoding: 'utf16le' });
  console.log(`Created task XML: ${xmlPath}`);

  // Import the task
  try {
    // Delete existing task if present
    try {
      execSync('schtasks /delete /tn "MasonAutopilot" /f 2>nul', {
        stdio: 'ignore',
      });
    } catch {
      // Ignore if not exists
    }

    execSync(`schtasks /create /tn "MasonAutopilot" /xml "${xmlPath}"`);

    console.log('\nTask Scheduler task installed!');
    console.log('\nUseful commands:');
    console.log('  schtasks /query /tn "MasonAutopilot"     # Check status');
    console.log('  schtasks /run /tn "MasonAutopilot"       # Start task');
    console.log('  schtasks /end /tn "MasonAutopilot"       # Stop task');
    console.log('  schtasks /delete /tn "MasonAutopilot"    # Remove task');
    console.log(`\nLogs: ${CONFIG_DIR}\\autopilot.log`);
  } catch (error) {
    console.error('Failed to install task:', error);
    console.log('\nTry running manually:');
    console.log(`  schtasks /create /tn "MasonAutopilot" /xml "${xmlPath}"`);
  }
}

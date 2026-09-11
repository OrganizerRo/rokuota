#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

// ANSI Color Helpers
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function printManPage() {
  console.log(`
${colors.bold}${colors.cyan}NAME${colors.reset}
       roku-deploy - Sideload and install zip applications onto a Roku device in Dev Mode.

${colors.bold}${colors.cyan}SYNOPSIS${colors.reset}
       ${colors.bold}node roku-deploy.js${colors.reset} [${colors.yellow}-ip${colors.reset} <roku_ip>] [${colors.yellow}-file${colors.reset} <path_to_zip>] [${colors.yellow}-u${colors.reset} <username>] [${colors.yellow}-p${colors.reset} <password>] [${colors.yellow}-v${colors.reset}] [${colors.yellow}-h${colors.reset}]

${colors.bold}${colors.cyan}DESCRIPTION${colors.reset}
       Automates HTTP Digest Authentication and multipart POST installation to Roku local developer tools.

${colors.bold}${colors.cyan}OPTIONS${colors.reset}
       ${colors.yellow}-ip${colors.reset} <address>    IP address of the Roku device on your local network (e.g., 192.168.1.50).
       ${colors.yellow}-file${colors.reset} <path>     Path to the zip file containing the Roku BrightScript package.
       ${colors.yellow}-u${colors.reset} <user>       Developer username (Defaults to: ${colors.green}rokudev${colors.reset}).
       ${colors.yellow}-p${colors.reset} <password>   Developer mode password (Prompted securely if omitted).
       ${colors.yellow}-v${colors.reset}, ${colors.yellow}--verbose${colors.reset}  Enable detailed logs of the deployment lifecycle.
       ${colors.yellow}-h${colors.reset}, ${colors.yellow}--help${colors.reset}     Display this manual page and exit.

${colors.bold}${colors.cyan}EXAMPLES${colors.reset}
       ${colors.green}node roku-deploy.js -ip 192.168.1.50 -file ./my-app.zip -v${colors.reset}
       ${colors.green}node roku-deploy.js -ip 10.0.0.12 -file ./app.zip -p mypass${colors.reset}
`);
}

// Parse Command Line Arguments
const args = process.argv.slice(2);
let ip = null;
let filePath = null;
let username = 'rokudev';
let password = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '-h' || arg === '--help') {
    printManPage();
    process.exit(0);
  } else if (arg === '-v' || arg === '--verbose') {
    verbose = true;
  } else if (arg === '-ip' && args[i + 1]) {
    ip = args[++i];
  } else if (arg === '-file' && args[i + 1]) {
    filePath = args[++i];
  } else if (arg === '-u' && args[i + 1]) {
    username = args[++i];
  } else if (arg === '-p' && args[i + 1]) {
    password = args[++i];
  }
}

function logVerbose(msg) {
  if (verbose) {
    console.log(`${colors.blue}[VERBOSE]${colors.reset} ${msg}`);
  }
}

function logSuccess(msg) {
  console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`);
}

function logError(msg, fatal = true) {
  console.error(`${colors.red}${colors.bold}[ERROR]${colors.reset} ${msg}`);
  if (fatal) process.exit(1);
}

// Prompt for input without external modules
function promptPassword(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Mask password output on typing
    process.stdin.on('data', (char) => {
      char = char + '';
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          break;
        default:
          process.stdout.write('\x1B[2K\x1B[0G' + query + '*'.repeat(rl.line.length));
          break;
      }
    });

    rl.question(query, (ans) => {
      rl.close();
      console.log('');
      resolve(ans);
    });
  });
}

// RFC 2617 Digest Auth Calculator using Node core crypto
function buildDigestHeader(authHeader, user, pass, method, path) {
  const params = {};
  const regex = /(\w+)=["']?([^"']+)["']?/g;
  let match;
  while ((match = regex.exec(authHeader)) !== null) {
    params[match[1]] = match[2];
  }

  const realm = params.realm || '';
  const nonce = params.nonce || '';
  const qop = params.qop;
  const opaque = params.opaque;

  const ha1 = crypto.createHash('md5').update(`${user}:${realm}:${pass}`).digest('hex');
  const ha2 = crypto.createHash('md5').update(`${method}:${path}`).digest('hex');

  let response;
  let cnonce = '';
  let nc = '00000001';

  if (qop) {
    cnonce = crypto.randomBytes(8).toString('hex');
    response = crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest('hex');
  } else {
    response = crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');
  }

  let header = `Digest username="${user}", realm="${realm}", nonce="${nonce}", uri="${path}", response="${response}"`;
  if (opaque) header += `, opaque="${opaque}"`;
  if (qop) header += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;

  return header;
}

// Construct standard HTTP multipart/form-data payload manually
function createMultipartPayload(filePath) {
  const boundary = '----RokuDeployFormBoundary' + crypto.randomBytes(8).toString('hex');
  const filename = path.basename(filePath);
  const fileData = fs.readFileSync(filePath);

  const header = 
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="mysubmit"\r\n\r\nInstall\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="archive"; filename="${filename}"\r\n` +
    `Content-Type: application/zip\r\n\r\n`;

  const footer = `\r\n--${boundary}--\r\n`;

  const body = Buffer.concat([
    Buffer.from(header, 'utf8'),
    fileData,
    Buffer.from(footer, 'utf8')
  ]);

  return { boundary, body };
}

async function main() {
  if (!ip || !filePath) {
    printManPage();
    logError('Missing required arguments (-ip and -file).');
  }

  // Validate File
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    logError(`Target file does not exist: "${absolutePath}"`);
  }

  if (!password) {
    password = await promptPassword(`${colors.yellow}Enter Roku Dev Password:${colors.reset} `);
  }

  logVerbose(`Targeting Roku IP: ${ip}`);
  logVerbose(`Loading zip package: ${absolutePath}`);

  const targetPath = '/plugin_install';
  
  // Step 1: Lightweight GET request to fetch auth challenge without pushing zip body
  logVerbose('Sending lightweight request to fetch auth challenge...');
  
  const initReqOptions = {
    hostname: ip,
    port: 80,
    path: targetPath,
    method: 'GET'
  };

  const req = http.request(initReqOptions, (res) => {
    logVerbose(`Initial response status: ${res.statusCode} ${res.statusMessage}`);

    if (res.statusCode === 401 && res.headers['www-authenticate']) {
      const authHeader = res.headers['www-authenticate'];
      logVerbose(`Digest challenge received: ${authHeader}`);

      // Compute Auth Header
      const digestResponse = buildDigestHeader(authHeader, username, password, 'POST', targetPath);
      logVerbose('Digest Authorization response constructed.');

      // Step 2: Prepare full multipart zip payload ONLY for authenticated POST
      const { boundary, body } = createMultipartPayload(absolutePath);

      const deployReqOptions = {
        hostname: ip,
        port: 80,
        path: targetPath,
        method: 'POST',
        headers: {
          'Authorization': digestResponse,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length
        }
      };

      logVerbose('Sending deployment payload with authentication...');
      const authReq = http.request(deployReqOptions, (authRes) => {
        logVerbose(`Authenticated response status: ${authRes.statusCode}`);

        let responseText = '';
        authRes.on('data', (chunk) => { responseText += chunk; });
        authRes.on('end', () => {
          if (authRes.statusCode === 200) {
            if (responseText.includes('Identical code already exists')) {
              logError('Roku rejected installation: Identical app version/build already exists on device.');
            } else if (responseText.includes('Install Failure') || responseText.includes('Install Error')) {
              logError(`Installation failed on device. Response details:\n${responseText}`);
            } else {
              logSuccess(`Package successfully installed and launched on Roku (${ip})!`);
            }
          } else if (authRes.statusCode === 401) {
            logError('Authentication Failed: Invalid Roku developer password.');
          } else {
            logError(`Deployment failed with HTTP Status: ${authRes.statusCode}`);
          }
        });
      });

      authReq.on('error', (err) => {
        logError(`Network error during deployment: ${err.message}`);
      });

      authReq.write(body);
      authReq.end();

    } else if (res.statusCode === 200) {
      logSuccess('Deployment completed without authentication prompt.');
    } else {
      logError(`Unexpected status from Roku: ${res.statusCode} ${res.statusMessage}`);
    }
  });

  req.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      logError(`Connection refused by ${ip}. Verify the IP is correct and "Dev Mode" is enabled on the Roku.`);
    } else if (err.code === 'ETIMEDOUT' || err.code === 'EHOSTUNREACH') {
      logError(`Could not reach ${ip}. Ensure your computer and Roku are on the same subnet.`);
    } else {
      logError(`Network error: ${err.message}`);
    }
  });

  req.end(); // Sent with no request body
}

main();
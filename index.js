const http = require('http');

const requestHandler = (request, response) => {
  response.end('Hello');
};

const server = http.createServer(requestHandler);
const port = 3000;

server.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err);
  }
  console.log(`server is listening on ${port}`);
});

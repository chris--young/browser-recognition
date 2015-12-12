'use strict';

let http = require('http'),
    fs = require('fs');

if (!fs.existsSync(`${__dirname}/browsers.json`))
  fs.writeFileSync(`${__dirname}/browsers.json`, JSON.stringify(new Map()));

let browsers = JSON.parse(fs.readFileSync(`${__dirname}/browsers.json`));
let ip = request => request.headers['x-forwarded-for'] || request.connection.remoteAddress;
let port = process.env.BR_PORT || 8421;

class Sighting {
  constructor(request) {
    this.at = new Date();
    this.from = ip(request);
  }
}

class Browser {
  constructor(request) {
    this.browser = request.headers['user-agent'];
    this.seen = [new Sighting(request)];
  }

  static update(etag, request) {
    browsers[etag].seen.push(new Sighting(request));
  }
}

function uuid() {
  let id = [];
  let s = new Date().getTime();

  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23)
      id[i] = '-';
    else if (i === 14)
      id[14] = '4';
    else {
      if (s <= 0x02)
        s = 33554432 + (Math.random() * 16777216) | 0;

      let r = s & 0xf;

      s = s >> 4;
      id[i] = ((i === 19) ? (r & 0x3) | 0x8 : r).toString(16)
    }
  }

  return id.join('');
}

function listener(request, response) {
  let etag = request.headers['if-none-match'];

  if (request.url !== '/') {
    response.statusCode = 404;
    response.end();
    return
  }
  
  if (etag) {
    response.statusCode = 304;
    response.end();

    browsers[etag] ? Browser.update(etag, request) : browsers[etag] = new Browser(request);
  } else {
    let id = uuid();

    response.writeHead(200, {etag: id});
    response.write(`oh, you again...\n\n id: ${id}`);
    response.end();

    browsers[id] = new Browser(request);
  }

  fs.writeFileSync(`${__dirname}/browsers.json`, JSON.stringify(browsers));
}

http.createServer(listener).listen(port);

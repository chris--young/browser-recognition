'use strict';

let https = require('https'),
    http = require('http'),
    fs = require('fs');

const HTTPS_PORT = process.argv[2] || 1337,
      HTTP_PORT = process.argv[3] || 8421;
    
let subdomains = [null],
    browsers = new Map();

function id() {
    let chars = '0123456789abcdefghijklmnopqrstuvwxyz'.split(''),
        output = '';

    for (let i = 0; i < 8; i++)
        output += chars[Math.floor(Math.random() * (chars.length - 1))];

    // check for collision
    return output;
}

function parseDomain(request) {
    let host = request.headers.host,
        address = request.connection.address().address;

    return ~address.indexOf('127.0.0.1') || address === '::1' ? 'localhost' : host.substring(host.lastIndexOf(':'), host.length);
}

function parseSubdomain(request) {
    let subdomain = request.headers.host.replace(`:${request.connection.address().port}`, '').replace(`.${request.domain}`, '');

    return subdomain === request.domain ? null : subdomain;
}

function subdomainLocation(index, request, encrypted) {
    let protocol = encrypted ? 'https' : 'http',
        port = encrypted ? HTTPS_PORT : HTTP_PORT;

    return index ? `${protocol}:\/\/${subdomains[index]}.${request.domain}:${port}/track` : `${protocol}:\/\/${request.domain}:${port}/track`;
}

function logRequest(request) {
    console.log('\nNEW REQUEST');

    console.log('request.url ==', request.url);
    console.log('request.headers ==', request.headers);
    console.log('request.connection.remoteAddress ==', request.connection.remoteAddress);
    console.log('request.connection.address() ==', request.connection.address());
    console.log('request.connection.encrypted ==', request.connection.encrypted);

    console.log('request.domain:', request.domain);
    console.log('request.subdomain:', request.subdomain);
}

function route(request, response) {
    let index = subdomains.indexOf(request.subdomain);

    if (request.method !== 'GET') {
        response.statusCode = 405;
    } else if (!~index || (request.url !== '/' && request.url !== '/track')) {
        response.statusCode = 404;
    /* } else if (request.connection.encrypted && request.url === '/') {
        response.statusCode = 404;
    } else if (!request.connection.encrypted && request.url === '/') {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.write('<!doctype html><html><body>oh, you again...<iframe src="http://localhost:8421/track" width=1000 height=500></iframe></body></html>'); */
    } else {
        logRequest(request);
        if (request.connection.encrypted) {
            if (request.subdomain !== null) {
                response.writeHead(302, { 'Location': subdomainLocation(0, request, true) });
                console.log('ID FOUND');
            } else {
                response.writeHead(200, { 'Content-Type': 'application/json', 'Strict-Transport-Security': 'max-age=31536000' });
                response.write(JSON.stringify({ id: browsers.get(request.connection.remoteAddress) }));
                console.log('ID DISPLAYED TO USER');
            }
        } else if (index === subdomains.length - 1) {
            response.writeHead(302, { 'Location': subdomainLocation(index, request, true) });
            console.log('ID ASSIGNED');
            subdomains.push(id());
            browsers.set(request.connection.remoteAddress, request.subdomain);
        } else if (request.subdomain !== null) {
            response.writeHead(302, { 'Location': subdomainLocation(++index, request) });
            console.log('CONTINUING SEARCH FOR ID');
        } else {
            response.writeHead(302, { 'Location': subdomainLocation(1, request) });
            console.log('STARTING SEARCH FOR ID');
        }
    }

    response.end();
}

function listen(request, response) {
    request.domain = parseDomain(request);
    request.subdomain = parseSubdomain(request);

    console.log('DOMAIN:', request.domain);
    console.log('SUBDOMAIN:', request.subdomain);

    route(request, response);
}

let options = {
    key: fs.readFileSync(`${__dirname}/certs/xip.io/xip.io.key`),
    cert: fs.readFileSync(`${__dirname}/certs/xip.io/xip.io.crt`)
};

subdomains.push(id());

https.createServer(options, listen).listen(HTTPS_PORT);
http.createServer(listen).listen(HTTP_PORT);

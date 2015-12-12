# browser-recognition

This is a proof-of-concept application which can recognize and track users using only server-side logic, without cookies.

You can see it live here [chrisyou.ng:1337](https://chrisyou.ng:1337)

What does this do?

* Each browser that visits the site is assigned a unique id
* After closing and restarting the browser is still assigned the same id
* After the browser is set to block all cookies the browser is still assigned the same id
* No client-side logic is used

## Setup

This application has no dependencies but requires Node.js v5.0.0 or newer.
You can change the default port from 1337 by setting the `$BR_PORT` environmental variable.

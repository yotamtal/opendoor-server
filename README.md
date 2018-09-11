# opendoor-server
> A small Node.js server that exposes a socket method to dial an AT command to an operator using US-Robotics USR5637 and c-kermit on raspian.

This is the server component of the project.
## Features
1. Authentication system based on LAN requests. Any request to the socket made from an internal IP address will be whitelisted in the ``devices.json`` file and will be permitted later from any network.
2. The AT command can be modified in the ``server.js`` file on line 124.
``kermit.stdin.write('ATDP**your-number**\r\n');``

## Installation

Raspbian:

1. Install kermit and nodejs:

```sh
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get update
sudo apt-get install ckermit
sudo apt-get install -y nodejs
```

2. Clone repository 
```sh
git clone https://github.com/yotamtal/opendoor-server
```

3. install packages
```sh
npm install
npm install pm2@latest -g
```

## Usage example
```sh
pm2 start /path/to/server.js
```
Socket will now be available on http://localhost:3333/ 
and an open method to dial the AT command to the modem will be exposed.

## Release History
* 1.0.0
    * Initial release

## Meta

Yotam Tal – yotam978@gmail.com

Distributed under the MIT license. See ``LICENSE`` for more information.

[https://github.com/yotamtal/](https://github.com/yotamtal/)

## Contributing

1. Fork it (<https://github.com/yotamtal/opendoor-server/fork>)
2. Create your feature branch (`git checkout -b feature/fooBar`)
3. Commit your changes (`git commit -am 'Add some fooBar'`)
4. Push to the branch (`git push origin feature/fooBar`)
5. Create a new Pull Request

<!-- Markdown link & img dfn's -->
[npm-image]: https://img.shields.io/npm/v/datadog-metrics.svg?style=flat-square
[npm-url]: https://npmjs.org/package/datadog-metrics
[npm-downloads]: https://img.shields.io/npm/dm/datadog-metrics.svg?style=flat-square
[travis-image]: https://img.shields.io/travis/dbader/node-datadog-metrics/master.svg?style=flat-square
[travis-url]: https://travis-ci.org/dbader/node-datadog-metrics
[wiki]: https://github.com/yourname/yourproject/wiki

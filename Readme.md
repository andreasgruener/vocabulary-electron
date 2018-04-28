# Status

Work in progress.

## Install

Overall install information.

### Install Node.js

<https://nodejs.org/>


#### Mac & Homebrew

```
brew install node
```

#### Linux

```
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -git
sudo apt-get install -y nodejs
sudo apt-get install nodejs
sudo apt-get install npm
```

### build and deploy binary ###
```
git pull; npm run package-linux; cp -R release-builds/vocabulary-linux-x64 ~/bin/
```

### Install Node Modules

```bash
$ npm install electron
$ npm install electron-packager
$ npm install
```

### Configure Language

```
export LANG=en_US.UTF-8
export LANG=en_GB.UTF-8
```


### Build

```
$ npm run package-<mac|windows|linux>
```
#### Trouble Shooting
Spell Checker is a native module, so it might fail to build on linux with a error such as:
````
NODE_MODULE_VERSION 59. This version of Node.js requires
NODE_MODULE_VERSION 57. Please try re-compiling or re-installing

```
Solution, rebuild everything native (spell checker) on your system:
```
npm install electron-rebuild
./node_modules/.bin/electron-rebuild
```

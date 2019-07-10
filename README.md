# Pub?

[![Build Status](https://travis-ci.com/threesquared/pub.svg?branch=master)](https://travis-ci.com/threesquared/pub)
![GitHub package.json version](https://img.shields.io/github/package-json/v/threesquared/pub.svg)
![Code Climate maintainability](https://img.shields.io/codeclimate/maintainability-percentage/threesquared/pub.svg)
![GitHub](https://img.shields.io/github/license/threesquared/pub.svg)

> A serverless Slack bot written in Typescript to work out if anyone wants to go to the pub

## Usage

Simply use the `/pub` slash command in your Slack channel to start a voting round.

![Screen Recording 2019-06-25 at 01 45 pm](https://user-images.githubusercontent.com/892142/60099619-f0392c00-974f-11e9-8ad7-532848d3cbc9.gif)

## Deploy

You can deploy your own version using the serverless framework. First make sure to copy `.env.exmaple` to `.env` and fill in the values. Then deploy with the deploy command:

```bash
npm run deploy
```

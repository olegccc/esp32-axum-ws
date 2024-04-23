#!/bin/sh

cd client
yarn
yarn build:if-changed


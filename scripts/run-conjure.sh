#!/bin/sh
CONJURE_VERSION=$1
rm -rf conjure-api && mkdir conjure-api &&
./conjure-${CONJURE_VERSION}/bin/conjure compile demo.yml demo.conjure.json &&
conjure-typescript generate --rawSource demo.conjure.json conjure-api
#!/bin/sh
CONJURE_VERSION=$1
CONJURE_PATH=$2
echo "Generating Typescript client" &&
ts-node src/generator.ts ${CONJURE_PATH} src/client.ts > generated-conjure.yml &&
echo "Compiling Conjure" &&
rm -rf conjure-api && mkdir conjure-api &&
./conjure-${CONJURE_VERSION}/bin/conjure compile generated-conjure.yml generated.conjure.json &&
conjure-typescript generate --rawSource generated.conjure.json conjure-api &&
rm generated-conjure.yml generated.conjure.json
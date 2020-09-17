#!/bin/sh
CONJURE_VERSION=$1
if [ -d "conjure-${CONJURE_VERSION}" ]; then
  echo "Conjure ${CONJURE_VERSION} already installed"
else
  echo "Installing Conjure ${CONJURE_VERSION}"
  curl -sL https://palantir.bintray.com/releases/com/palantir/conjure/conjure/${CONJURE_VERSION}/conjure-${CONJURE_VERSION}.tgz | tar zx
fi
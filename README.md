# 🔥 🔥 🔥 Conjure Firebase 🔥 🔥 🔥

Strongly type your Firebase Cloud Function API using [Conjure](https://github.com/palantir/conjure)

## Installation

This package is available on [npm](https://www.npmjs.com/package/conjure-firebase). To install, run:

```
npm install conjure-firebase
```

Once installed, create a single YAML file to describe your API. Your Conjure definitions must follow [this format](https://palantir.github.io/conjure/#/docs/spec/conjure_definitions), with some small modifications. Any "service" may be treated as a "Firebase Callable" service by setting the field `firebase-callable: true`. For these services, do not define `base-path` or `default-auth` and for that service's endpoints, do not define `http`.

For example:

```yaml
types:
  definitions:
    default-package: com.conjurefirebase.firebase.api
    objects:
      Greeting:
        fields:
          to: string
          from: string
          text: string
services:
  FirebaseFunctionsService:
    name: Firebase Functions
    package: com.conjurefirebase.firebase.api
    firebase-callable: true
    endpoints:
      sayHello:
        args:
          name: string
        returns: Greeting
  NormalService:
    name: Firebase Functions
    package: com.conjurefirebase.firebase.api
    base-path: /normal-service
    default-auth: none
    endpoints:
      sayHello:
        http: POST /
        args:
          name: string
        returns: Greeting
```

Generate a Typescript client for your API by running:

```
npx conjure-firebase <path/to/api.yml> <path/for/generated/client.ts>
```

You may also call `conjure-firebase` directly from a script in your `package.json`.

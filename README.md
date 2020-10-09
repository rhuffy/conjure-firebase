# 🔥 🔥 🔥 Conjure Firebase 🔥 🔥 🔥

NOTE: This package is currently in active development and not ready for production use.

Strongly type your Firebase Cloud Function API using [Conjure](https://github.com/palantir/conjure)

## Installation

This package is available on [npm](https://www.npmjs.com/package/conjure-firebase). To install, run:

```
npm install conjure-firebase
```

## Usage

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
npx conjure-firebase <path/to/api.yml> <path/for/generated/client.ts> <path/to/server/function/project>
```

Alternatively you can use a dotfile `.conjure-firebase-config` to specify your arguments. This file must follow a json format and specify the fields  `conjureDefinitions`, `clientFile`, and `functionsPath`:

```
{
  "conjureDefinitions": "example-api.yml",
  "clientFile": "src/example-client.ts",
  "functionsPath": "functions/src"
}
```


You may also call `conjure-firebase` directly from a script in your `package.json`.

A generated client file for the above example looks like this:

```typescript
import { DefaultHttpApiBridge, FirebaseApiBridge } from "conjure-firebase";
import { FirebaseFunctionsService, NormalService } from "./conjure-api";

const fab = new FirebaseApiBridge();
const hab = new DefaultHttpApiBridge({
  baseUrl: "https://us-central1-my-cool-project.cloudfunctions.net",
  userAgent: {
    productName: "conjure-firebase",
    productVersion: "1.0.0",
  },
});

const FirebaseFunctionsService_instance = new FirebaseFunctionsService(fab);
export { FirebaseFunctionsService_instance as FirebaseFunctionsService };
const NormalService_instance = new NormalService(hab);
export { NormalService_instance as NormalService };
```

You can consume the client like this:

```typescript
import { FirebaseFunctionsService } from "./client";
import { IGreeting } from "./conjure-api";

async function myFunction() {
  const response: IGreeting = await FirebaseFunctionsService.sayHello("Alex");
  console.log(response.text);
}
```


##How Does It Work?

Conjure Typescript generates a folder containing the definitions for the API objects and services. The objects are just TypeScript interfaces that can be imported as normal. Services are classes, and require an ApiBridge to work. The ApiBridge actually calls the endpoint that the conjure API is describing. Conjure Typescript provides the interface IHttpApiBridge which we implement.

```typescript
// conjure-client

export interface IHttpEndpointOptions {
    /** Conjure service name. Doesn't affect the network request. */
    serviceName?: string;
    /** Path to make a request to, e.g. "/foo/{param1}/bar". */
    endpointPath: string;
    /** Conjure endpoint name. Doesn't affect the network request. */
    endpointName?: string;
    /** HTTP headers. */
    headers?: {
        [header: string]: string | number | boolean | undefined | null;
    };
    /** HTTP method. */
    method: string;
    /** MIME type of the outgoing request, usually "application/json" */
    requestMediaType?: MediaType;
    /** MIME type of the expected server response, often "application/json" or "application/octet-stream" */
    responseMediaType?: MediaType;
    /** Values to be interpolated into the endpointPath. */
    pathArguments: any[];
    /** Key-value mappings to be appended to the request query string. */
    queryArguments: any;
    /** Data to send in the body. */
    data?: any;
    /** return binary response as web stream */
    binaryAsStream?: boolean;
}

export interface IHttpApiBridge {
    callEndpoint<T>(parameters: IHttpEndpointOptions): Promise<T>;
}```


```typescript
// conjure-firebase (our code)
export class FirebaseApiBridge implements IHttpApiBridge {
    async callEndpoint<T>(parameters: IHttpEndpointOptions): Promise<T> {
        // we use the firebase sdk to directly call the function, but
        // we return the response as a typed object
        const result = await functions.httpsCallable(parameters.endpointName!)(
            parameters.data
        );
        return result.data;
    }
}```

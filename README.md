# 🔥 🔥 🔥 Conjure Firebase 🔥 🔥 🔥

_Strongly type your Firebase Cloud Function API using [Conjure](https://github.com/palantir/conjure)_

## Installation

This package is available on [npm](https://www.npmjs.com/package/conjure-firebase). To install, run:

```
npm install conjure-firebase
```

## Usage

Once installed, create a single YAML file to describe your API. Your Conjure definitions must follow [this format](https://palantir.github.io/conjure/#/docs/spec/conjure_definitions), with some small modifications. Any "service" may be treated as a "Firebase Callable" service by setting the field `firebase-callable: true`. For these services:

- Do not define `base-path` or `default-auth`
- Each endpoint in the service corresponds to a Cloud Function that you will create. For each endpoint in the service:
  - Do not define an `http` field
  - Simply provide an endpoint name as well as a single `data` field (for your function's input type) and a `returns` field (for your function's return type)
  - The type specified in the `data` field must be an object defined in the "types" portion of the YAML file

For example:

```yaml
types:
  definitions:
    default-package: com.conjurefirebase.firebase.api
    objects:
      Name:
        fields:
          first: string
          last: string
      Greeting:
        fields:
          sender: Name
          text: string
services:
  FirebaseFunctionsService:
    name: Firebase Functions
    package: com.conjurefirebase.firebase.api
    firebase-callable: true
    endpoints:
      sayHello:
        data: Name
        returns: Greeting
```

Generate a Typescript client for your API by running:

```
npx conjure-firebase <path/to/api.yml> <path/for/generated/client.ts> <path/to/server/function/project>
```

Alternatively you can use a dotfile `.conjure-firebase-config` to specify your arguments. This file must follow a json format and specify the fields `conjureDefinitions`, `clientFile`, and `functionsPath`:

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
import { FirebaseFunctionsService as __FirebaseFunctionsService } from "../conjure-api";

const fab = new FirebaseApiBridge();

const FirebaseFunctionsService = new __FirebaseFunctionsService(fab);
export { FirebaseFunctionsService };
```

You can consume the client like this:

```typescript
import { FirebaseFunctionsService } from "./client";
import { IName, IGreeting } from "./conjure-api";

async function myFunction() {
  const data: IName = { first: "John", last: "Doe" };
  const response: IGreeting = await FirebaseFunctionsService.sayHello(data);
  console.log(response.text);
}
```

Note that using Conjure-Firebase allows you to view all the endpoints present in a service you've defined. Typing "FirebaseFunctionsService." in an IDE offers autocomplete prompts for available endpoints.

## How Does It Work?

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
}
```

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
}
```

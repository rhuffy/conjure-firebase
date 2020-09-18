import { DefaultHttpApiBridge } from "conjure-client";
import FirebaseApiBridge from "./FirebaseApiBridge";
import { FirebaseFunctionsService, NormalService } from "../conjure-api";

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

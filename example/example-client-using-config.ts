import { DefaultHttpApiBridge, FirebaseApiBridge } from "conjure-firebase";
import { FirebaseFunctionsService as __FirebaseFunctionsService } from "./conjure-api";

const fab = new FirebaseApiBridge();
const FirebaseFunctionsService = new __FirebaseFunctionsService(fab);

export { FirebaseFunctionsService };

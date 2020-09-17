import { FirebaseFunctionsService } from "./ts-output";
import FirebaseApiBridge from "./FirebaseApiBridge";

export function main() {
  const fab = new FirebaseApiBridge();
  const ffs = new FirebaseFunctionsService(fab);
}

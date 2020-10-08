import * as functions from "firebase-functions";
import { Iundefined } from "./conjure-api";

function sayHello(
  data: Iundefined,
  context: functions.https.CallableContext
): IGreeting {
  throw new Error("Not Implemented!");
}

const __sayHello = functions.https.onCall(sayHello);

export { __sayHello as sayHello };

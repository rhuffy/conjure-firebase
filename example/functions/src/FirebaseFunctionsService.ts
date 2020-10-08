import * as functions from "firebase-functions";
import { IMyInput1, IMyInput2, IMyOutput } from "./conjure-api";

function sayHello(
  data: IMyInput1,
  context: functions.https.CallableContext
): IMyOutput {
  throw new Error("Not Implemented!");
}

function sayHello2(
  data: IMyInput2,
  context: functions.https.CallableContext
): IMyOutput {
  throw new Error("Not Implemented!");
}

const __sayHello = functions.https.onCall(sayHello);
const __sayHello2 = functions.https.onCall(sayHello2);

export { __sayHello as sayHello, __sayHello2 as sayHello2 };

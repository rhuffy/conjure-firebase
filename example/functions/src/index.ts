import * as functions from "firebase-functions";
export interface IGreeting {
  to: string;
  from: string;
  text: string;
}
export const sayHello = functions.https.onCall((data: IGreeting, _context) => {
  functions.logger.log("Hello world!", data);
});

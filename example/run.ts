import * as firebase from "firebase";
const firebaseConfig = require("./firebaseConfig.json");
firebase.initializeApp(firebaseConfig);

import { FirebaseFunctionsService } from "./example-client";

FirebaseFunctionsService.sayHello({
  to: "you",
  from: "me",
  text: "hi there",
}).then((response) => {
  console.log(
    "Color: " +
      response.color +
      " | Number: " +
      response.color +
      " | Response: " +
      response.response
  );
});

FirebaseFunctionsService.sayHello2({
  name: "Johnny Appleseed",
}).then((response) => {
  console.log(
    "Color: " +
      response.color +
      " | Number: " +
      response.color +
      " | Response: " +
      response.response
  );
});

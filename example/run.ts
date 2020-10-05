import * as firebase from "firebase";

const firebaseConfig = require("./firebaseConfig.json");

firebase.initializeApp(firebaseConfig);

firebase.functions().httpsCallable("sayHello")({ someParam: "palantir" });

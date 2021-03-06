import { IHttpApiBridge, IHttpEndpointOptions } from "conjure-client";
import firebase from "firebase/app";
import "firebase/functions";

const functions = firebase.functions();

export class FirebaseApiBridge implements IHttpApiBridge {
  async callEndpoint<T>(parameters: IHttpEndpointOptions): Promise<T> {
    const result = await functions.httpsCallable(parameters.endpointName!)(
      parameters.data
    );
    return result.data;
  }
  async call<T>(
    serviceName: string,
    endpointName: string,
    method: string,
    endpointPath: string,
    data?: any,
    headers?: { [header: string]: string | number | boolean },
    queryArguments?: { [paramName: string]: any },
    pathArguments?: any[],
    requestMediaType?: string,
    responseMediaType?: string
  ): Promise<T> {
    const result = await functions.httpsCallable(endpointName)(data);
    return result.data;
  }
}

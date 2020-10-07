export interface IConjureSourceFile {
  types: any;
  services: any;
}

export interface IServiceDefinition {
  name: string;
  type: "http" | "firebase";
  endpoints: IEndpoint[];
}

export interface IEndpoint {
  name: string;
  inputType: string;
  returns: string;
}

interface ITypesDefinition {}

interface IServicesDefinition {}

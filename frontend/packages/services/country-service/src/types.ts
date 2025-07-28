export interface CountryData {
  name: string;
  callingCodes: string[];
  flag: string;
  countryCode: string;
  lastUpdated: number;
}

export interface AddressInfo {
  country: string;
  countryCode: string;
  callingCode: string;
  flag: string;
}

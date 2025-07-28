import axios from 'axios';
import { type CountryData } from './types';

export class CountryService {
  private static instance: CountryService;
  private readonly API_ENDPOINT = '/api/countries';
  private readonly BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.alberguedelcarrascalejo.com';

  private constructor() {}

  public static getInstance(): CountryService {
    if (!CountryService.instance) {
      CountryService.instance = new CountryService();
    }
    return CountryService.instance;
  }

  private async request(endpoint: string): Promise<any> {
    try {
      const response = await axios.get(`${this.BASE_URL}${endpoint}`);
      return response.data;
    } catch (error) {
      console.error('API error:', error);
      throw error;
    }
  }

  public async getCountryInfo(countryCode: string): Promise<CountryData | null> {
    try {
      return await this.request(`${this.API_ENDPOINT}/${countryCode}`);
    } catch (error) {
      console.error('Error fetching country data:', error);
      return null;
    }
  }

  public async getCountryInfoFromAddress(address: string): Promise<CountryData | null> {
    try {
      // First try to get country code from address
      const countryCode = address
        .toUpperCase()
        .match(/[A-Z]{2}/)?.[0];

      if (!countryCode) {
        return null;
      }

      return this.getCountryInfo(countryCode);
    } catch (error) {
      console.error('Error extracting country info from address:', error);
      return null;
    }
  }
}

export const countryService = CountryService.getInstance();

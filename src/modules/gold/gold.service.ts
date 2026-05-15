import { Injectable, HttpException, HttpStatus } from "@nestjs/common";

@Injectable()
export class GoldService {
  private readonly API_URL = "https://www.vang.today/api/prices";

  async getGoldPrices(type: string = "SJL1L10", days: number = 7) {
    try {
      const response = await fetch(`${this.API_URL}?type=${type}&days=${days}`);
      if (!response.ok) {
        throw new HttpException(
          "Failed to fetch gold prices",
          HttpStatus.BAD_GATEWAY,
        );
      }
      return await response.json();
    } catch (error) {
      throw new HttpException(
        error.message || "External API Error",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

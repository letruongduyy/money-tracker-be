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
      const message =
        error instanceof Error ? error.message : "External API Error";
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getCurrencyRates() {
    try {
      const response = await fetch(
        "https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx",
      );
      if (!response.ok) {
        throw new HttpException(
          "Failed to fetch currency rates from Vietcombank",
          HttpStatus.BAD_GATEWAY,
        );
      }
      const xmlData = await response.text();

      // Simple regex-based parsing for Exrate elements
      const rates: Array<{
        currencyCode: string;
        currencyName: string;
        buy: string;
        transfer: string;
        sell: string;
      }> = [];
      const exrateRegex =
        /<Exrate\s+CurrencyCode="([^"]*)"\s+CurrencyName="([^"]*)"\s+Buy="([^"]*)"\s+Transfer="([^"]*)"\s+Sell="([^"]*)"/g;

      let match;
      while ((match = exrateRegex.exec(xmlData)) !== null) {
        rates.push({
          currencyCode: match[1].trim(),
          currencyName: match[2].trim(),
          buy: match[3].trim(),
          transfer: match[4].trim(),
          sell: match[5].trim(),
        });
      }

      // Extract DateTime
      const dateTimeMatch = /<DateTime>([^<]*)<\/DateTime>/.exec(xmlData);
      const dateTime = dateTimeMatch
        ? dateTimeMatch[1]
        : new Date().toISOString();

      // Sort by sell price descending (largest first)
      rates.sort((a, b) => {
        const sellA = parseFloat(a.sell.replace(/,/g, "")) || 0;
        const sellB = parseFloat(b.sell.replace(/,/g, "")) || 0;
        return sellB - sellA;
      });

      return {
        dateTime,
        rates,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "External API Error";
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

import { Controller, Get, Query } from "@nestjs/common";
import { GoldService } from "./gold.service";

@Controller("gold")
export class GoldController {
  constructor(private readonly goldService: GoldService) {}

  @Get("prices")
  async getPrices(
    @Query("type") type?: string,
    @Query("days") days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return this.goldService.getGoldPrices(type, daysNum);
  }
}

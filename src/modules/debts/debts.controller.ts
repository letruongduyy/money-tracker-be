import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DebtsService } from './debts.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateDebtDto } from './dto/debt.dto';

@Controller('debts')
@UseGuards(AuthGuard('jwt'))
export class DebtsController {
  constructor(private debtsService: DebtsService) {}

  @Post()
  async create(@Body() body: CreateDebtDto, @Req() req) {
    return this.debtsService.create(body, req.user.userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<CreateDebtDto>,
    @Req() req,
  ) {
    return this.debtsService.update(id, body, req.user.userId);
  }

  @Get()
  async findAll(@Req() req) {
    return this.debtsService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    return this.debtsService.findOne(id, req.user.userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    return this.debtsService.remove(id, req.user.userId);
  }
}

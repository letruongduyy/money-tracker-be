import { Controller, Post, Get, Body, Req, UseGuards, Patch, Param, Delete } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';

@Controller('assets')
@UseGuards(AuthGuard('jwt'))
export class AssetsController {
  constructor(private assetsService: AssetsService) {}

  @Post()
  create(@Body() body: CreateAssetDto, @Req() req) {
    return this.assetsService.create(body, req.user.userId);
  }

  @Post('sync')
  sync(@Body() body: CreateAssetDto, @Req() req) {
    return this.assetsService.upsertByLocalId(body, req.user.userId);
  }

  @Get()
  findAll(@Req() req) {
    return this.assetsService.findAll(req.user.userId);
  }

  @Delete('local/:localId')
  removeLocal(@Param('localId') localId: string, @Req() req) {
    return this.assetsService.removeByLocalId(localId, req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateAssetDto,
    @Req() req,
  ) {
    return this.assetsService.update(id, body, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.assetsService.remove(id, req.user.userId);
  }
}

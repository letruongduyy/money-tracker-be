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
import { CredentialsService } from './credentials.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateCredentialDto } from './dto/credential.dto';

@Controller('credentials')
@UseGuards(AuthGuard('jwt'))
export class CredentialsController {
  constructor(private credentialsService: CredentialsService) {}

  @Post()
  async create(@Body() body: CreateCredentialDto, @Req() req) {
    return this.credentialsService.create(body, req.user.userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<CreateCredentialDto>,
    @Req() req,
  ) {
    return this.credentialsService.update(id, body, req.user.userId);
  }

  @Get()
  async findAll(@Req() req) {
    return this.credentialsService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    return this.credentialsService.findOne(id, req.user.userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    return this.credentialsService.remove(id, req.user.userId);
  }
}

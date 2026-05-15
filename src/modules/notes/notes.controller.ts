import { Controller, Post, Get, Body, Req, UseGuards, Patch, Param, Delete } from '@nestjs/common';
import { NotesService } from './notes.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateNoteDto } from './dto/create-note.dto';

@Controller('notes')
@UseGuards(AuthGuard('jwt'))
export class NotesController {
  constructor(private notesService: NotesService) { }

  @Post()
  async create(@Body() body: CreateNoteDto, @Req() req) {
    return this.notesService.create(body, req.user.userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<CreateNoteDto>,
    @Req() req,
  ) {
    return this.notesService.update(id, body, req.user.userId);
  }

  @Get()
  async findAll(@Req() req) {
    return this.notesService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    return this.notesService.findOne(id, req.user.userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    return this.notesService.remove(id, req.user.userId);
  }
}

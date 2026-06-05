import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { Note, NoteSchema } from './schemas/note.schema';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Note.name, schema: NoteSchema }]),
    PushModule,
  ],
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule { }

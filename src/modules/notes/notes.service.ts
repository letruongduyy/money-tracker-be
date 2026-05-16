import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Note, NoteDocument } from './schemas/note.schema';
import { CreateNoteDto } from './dto/create-note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectModel(Note.name) private noteModel: Model<NoteDocument>,
  ) { }

  async create(createNoteDto: CreateNoteDto, userId: string): Promise<Note> {
    const createdNote = new this.noteModel({
      ...createNoteDto,
      user: new Types.ObjectId(userId),
    });
    return createdNote.save();
  }

  async update(id: string, updateNoteDto: Partial<CreateNoteDto>, userId: string): Promise<Note> {
    const updatedNote = await this.noteModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), user: new Types.ObjectId(userId) },
      { $set: updateNoteDto },
      { returnDocument: 'after' },
    ).exec();

    if (!updatedNote) {
      throw new NotFoundException('Note not found');
    }
    return updatedNote;
  }

  async findAll(userId: string): Promise<Note[]> {
    return this.noteModel.find({ user: new Types.ObjectId(userId) }).sort({ isPinned: -1, updatedAt: -1 }).exec();
  }

  async findOne(id: string, userId: string): Promise<Note> {
    const note = await this.noteModel.findOne({
      _id: new Types.ObjectId(id),
      user: new Types.ObjectId(userId),
    }).exec();

    if (!note) {
      throw new NotFoundException('Note not found');
    }
    return note;
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.noteModel.deleteOne({
      _id: new Types.ObjectId(id),
      user: new Types.ObjectId(userId),
    }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Note not found');
    }
  }
}

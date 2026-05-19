import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Note, NoteDocument } from "./schemas/note.schema";
import { CreateNoteDto } from "./dto/create-note.dto";

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(@InjectModel(Note.name) private noteModel: Model<NoteDocument>) {}

  async create(createNoteDto: CreateNoteDto, userId: string): Promise<Note> {
    try {
      const createdNote = new this.noteModel({
        ...createNoteDto,
        user: new Types.ObjectId(userId),
      });
      return createdNote.save();
    } catch (error) {
      this.logger.error("Failed to create note", error as Error);
      throw error;
    }
  }

  async update(
    id: string,
    updateNoteDto: Partial<CreateNoteDto>,
    userId: string,
  ): Promise<Note> {
    try {
      const updatedNote = await this.noteModel
        .findOneAndUpdate(
          { _id: new Types.ObjectId(id), user: new Types.ObjectId(userId) },
          { $set: updateNoteDto },
          { returnDocument: "after" },
        )
        .exec();

      if (!updatedNote) {
        throw new NotFoundException("Note not found");
      }
      return updatedNote;
    } catch (error) {
      this.logger.error(`Failed to update note ${id}`, error as Error);
      throw error;
    }
  }

  async findAll(userId: string): Promise<Note[]> {
    try {
      return this.noteModel
        .find({ user: new Types.ObjectId(userId) })
        .sort({ isPinned: -1, updatedAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error(
        `Failed to find notes for user ${userId}`,
        error as Error,
      );
      throw error;
    }
  }

  async findOne(id: string, userId: string): Promise<Note> {
    try {
      const note = await this.noteModel
        .findOne({
          _id: new Types.ObjectId(id),
          user: new Types.ObjectId(userId),
        })
        .exec();

      if (!note) {
        throw new NotFoundException("Note not found");
      }
      return note;
    } catch (error) {
      this.logger.error(`Failed to find note ${id}`, error as Error);
      throw error;
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      const result = await this.noteModel
        .deleteOne({
          _id: new Types.ObjectId(id),
          user: new Types.ObjectId(userId),
        })
        .exec();

      if (result.deletedCount === 0) {
        throw new NotFoundException("Note not found");
      }
    } catch (error) {
      this.logger.error(`Failed to remove note ${id}`, error as Error);
      throw error;
    }
  }
}

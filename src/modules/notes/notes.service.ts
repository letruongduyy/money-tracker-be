import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Note, NoteDocument } from "./schemas/note.schema";
import { CreateNoteDto } from "./dto/create-note.dto";
import { Cron } from "@nestjs/schedule";
import { PushService } from "../push/push.service";

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(
    @InjectModel(Note.name) private noteModel: Model<NoteDocument>,
    private pushService: PushService,
  ) {}

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
      const updateData: any = { ...updateNoteDto };
      if (updateData.remindAt !== undefined) {
        updateData.isReminderSent = false;
      }

      // Only attempt findOneAndUpdate if id looks like a valid ObjectId
      if (Types.ObjectId.isValid(id)) {
        const updatedNote = await this.noteModel
          .findOneAndUpdate(
            { _id: new Types.ObjectId(id), user: new Types.ObjectId(userId) },
            { $set: updateData },
            { returnDocument: "after" },
          )
          .exec();

        if (updatedNote) {
          return updatedNote;
        }

        this.logger.warn(
          `Note ${id} not found for user ${userId} — creating a new one instead`,
        );
      } else {
        this.logger.warn(
          `Invalid ObjectId "${id}" — creating a new note instead`,
        );
      }

      // Fallback: create a new note with the provided data
      const createdNote = new this.noteModel({
        ...updateData,
        user: new Types.ObjectId(userId),
      });
      return createdNote.save();
    } catch (error) {
      this.logger.error(`Failed to update note ${id}`, error as Error);
      throw error;
    }
  }

  @Cron("* * * * *")
  async checkReminders() {
    try {
      const now = new Date();
      const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const activeReminders = await this.noteModel
        .find({
          remindAt: { $gte: oneDayAgo, $lte: fifteenMinutesFromNow },
          isReminderCompleted: false,
          isReminderSent: { $ne: true },
        })
        .exec();

      if (activeReminders.length === 0) return;

      this.logger.log(`Found ${activeReminders.length} active note reminder(s) to push`);

      for (const note of activeReminders) {
        try {
          const userId = String(note.user);
          const title = note.title || "Lời nhắc ⏰";
          const body = "Đến giờ rồi! Mày mau đi đi! ⏰";

          await this.pushService.sendToUser(userId, {
            title,
            body,
            data: {
              type: "note_reminder",
              noteId: String(note._id),
            },
          });

          note.isReminderSent = true;
          await note.save();
        } catch (err) {
          this.logger.error(`Failed to send push for note ${note._id}:`, err);
        }
      }
    } catch (error) {
      this.logger.error("Error checking note reminders:", error);
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

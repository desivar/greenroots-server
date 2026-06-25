import mongoose, { Document, Schema } from 'mongoose';

export interface IJournalEntry extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  title: string;
  body: string;
  photos: string[];
  createdAt: Date;
  updatedAt: Date;
}

const JournalEntrySchema = new Schema<IJournalEntry>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date:   { type: Date, required: true },
  title:  { type: String, required: true, trim: true },
  body:   { type: String, required: true },
  photos: { type: [String], default: [] },
}, { timestamps: true });

JournalEntrySchema.index({ userId: 1, date: -1 });
export const JournalEntry = mongoose.model<IJournalEntry>('JournalEntry', JournalEntrySchema);

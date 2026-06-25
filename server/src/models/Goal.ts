import mongoose, { Document, Schema } from 'mongoose';

export interface IGoal extends Document {
  userId: mongoose.Types.ObjectId;
  month: string;
  title: string;
  targetDate?: Date;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
}

const GoalSchema = new Schema<IGoal>({
  userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  month:       { type: String, required: true },
  title:       { type: String, required: true, trim: true },
  targetDate:  { type: Date },
  completed:   { type: Boolean, default: false },
  completedAt: { type: Date },
}, { timestamps: true });

GoalSchema.index({ userId: 1, month: 1 });
export const Goal = mongoose.model<IGoal>('Goal', GoalSchema);

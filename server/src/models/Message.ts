import mongoose, { Document, Schema } from 'mongoose';

export type MessageScope = 'broadcast' | 'country' | 'zone' | 'district' | 'team' | 'direct';

export interface IMessage extends Document {
  from: mongoose.Types.ObjectId;
  scope: MessageScope;
  targetCountry?: string;
  targetZone?: number;
  targetDistrict?: number;
  targetTeam?: string;
  targetUsers?: mongoose.Types.ObjectId[];
  title: string;
  body: string;
  isAiDraft: boolean;
  aiSuggestion?: string;
  humanApproved: boolean;
  attachmentUrl?: string;
  trainingLink?: string;
  isAutoAlert: boolean;
  alertType?: 'budget_overspend' | 'visa_expiry' | 'low_stock' | 'health_emergency' | 'rotation' | 'general';
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  from:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
  scope:          { type: String, enum: ['broadcast','country','zone','district','team','direct'], required: true },
  targetCountry:  { type: String },
  targetZone:     { type: Number },
  targetDistrict: { type: Number },
  targetTeam:     { type: String },
  targetUsers:    [{ type: Schema.Types.ObjectId, ref: 'User' }],
  title:          { type: String, required: true, trim: true },
  body:           { type: String, required: true },
  isAiDraft:      { type: Boolean, default: false },
  aiSuggestion:   { type: String },
  humanApproved:  { type: Boolean, default: true },
  attachmentUrl:  { type: String },
  trainingLink:   { type: String },
  isAutoAlert:    { type: Boolean, default: false },
  alertType:      {
    type: String,
    enum: ['budget_overspend','visa_expiry','low_stock','health_emergency','rotation','general'],
  },
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export default mongoose.model<IMessage>('Message', MessageSchema);

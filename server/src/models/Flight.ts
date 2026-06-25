import mongoose, { Document, Schema } from 'mongoose';

export interface IFlight extends Document {
  userId: mongoose.Types.ObjectId;
  country: string;
  flightType: 'arrival' | 'departure' | 'internal';
  origin: string;
  destination: string;
  airline?: string;
  flightNumber?: string;
  scheduledDate: Date;
  actualDate?: Date;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  cost?: number;
  currency?: string;
  coveredByOng: boolean;
  bookingReference?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FlightSchema = new Schema<IFlight>({
  userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  country:       { type: String, required: true },
  flightType:    { type: String, enum: ['arrival','departure','internal'], required: true },
  origin:        { type: String, required: true },
  destination:   { type: String, required: true },
  airline:       String, flightNumber: String,
  scheduledDate: { type: Date, required: true },
  actualDate:    Date,
  status:        { type: String, enum: ['scheduled','completed','cancelled','rescheduled'], default: 'scheduled' },
  cost: Number, currency: { type: String, default: 'USD' },
  coveredByOng:      { type: Boolean, default: true },
  bookingReference:  String, notes: String,
}, { timestamps: true });

FlightSchema.index({ userId: 1 });
FlightSchema.index({ country: 1, status: 1 });
export const Flight = mongoose.model<IFlight>('Flight', FlightSchema);

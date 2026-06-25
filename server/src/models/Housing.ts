import mongoose, { Document, Schema } from 'mongoose';

export interface IHousing extends Document {
  country: string;
  address: string;
  landlordName: string;
  landlordPhone: string;
  landlordEmail?: string;
  tenants: mongoose.Types.ObjectId[];
  monthlyRent: number;
  currency: string;
  leaseStart: Date;
  leaseEnd: Date;
  payments: { month: string; paid: boolean; paidOn?: Date; amount: number; receiptUrl?: string }[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HousingSchema = new Schema<IHousing>({
  country:       { type: String, required: true },
  address:       { type: String, required: true },
  landlordName:  { type: String, required: true },
  landlordPhone: { type: String, required: true },
  landlordEmail: String,
  tenants:       [{ type: Schema.Types.ObjectId, ref: 'User' }],
  monthlyRent:   { type: Number, required: true },
  currency:      { type: String, default: 'USD' },
  leaseStart:    { type: Date, required: true },
  leaseEnd:      { type: Date, required: true },
  payments: [{
    month: String, paid: { type: Boolean, default: false },
    paidOn: Date, amount: Number, receiptUrl: String,
  }],
  notes: String,
}, { timestamps: true });

HousingSchema.index({ country: 1 });
export const Housing = mongoose.model<IHousing>('Housing', HousingSchema);

import mongoose, { Document, Schema } from 'mongoose';

// ── Journal Entry ──────────────────────────────────────────────────────────────
export interface IJournalEntry extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  title: string;
  body: string;
  photos: string[];   // Cloudinary URLs
  createdAt: Date;
  updatedAt: Date;
}

const JournalEntrySchema = new Schema<IJournalEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date:   { type: Date, required: true },
    title:  { type: String, required: true, trim: true },
    body:   { type: String, required: true },
    photos: { type: [String], default: [] },
  },
  { timestamps: true }
);
JournalEntrySchema.index({ userId: 1, date: -1 });

export const JournalEntry = mongoose.model<IJournalEntry>('JournalEntry', JournalEntrySchema);


// ── Goal ──────────────────────────────────────────────────────────────────────
export interface IGoal extends Document {
  userId: mongoose.Types.ObjectId;
  month: string;     // 'YYYY-MM'
  title: string;
  targetDate?: Date;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
}

const GoalSchema = new Schema<IGoal>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    month:       { type: String, required: true },
    title:       { type: String, required: true, trim: true },
    targetDate:  { type: Date },
    completed:   { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: true }
);
GoalSchema.index({ userId: 1, month: 1 });

export const Goal = mongoose.model<IGoal>('Goal', GoalSchema);


// ── Budget / Expense ───────────────────────────────────────────────────────────
export type ExpenseCategory = 'food' | 'transport' | 'phone' | 'personal' | 'work' | 'other';

export interface IExpense {
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: Date;
}

export interface IBudget extends Document {
  userId: mongoose.Types.ObjectId;
  month: string;     // 'YYYY-MM'
  allowance: number; // assigned by finances secretary
  expenses: IExpense[];
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    description: { type: String, required: true },
    amount:      { type: Number, required: true },
    category:    {
      type: String,
      enum: ['food', 'transport', 'phone', 'personal', 'work', 'other'],
      default: 'other',
    },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

const BudgetSchema = new Schema<IBudget>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    month:      { type: String, required: true },
    allowance:  { type: Number, required: true },
    expenses:   { type: [ExpenseSchema], default: [] },
    totalSpent: { type: Number, default: 0 },
  },
  { timestamps: true }
);
BudgetSchema.index({ userId: 1, month: 1 }, { unique: true });

// Auto-recalculate totalSpent before save
BudgetSchema.pre('save', function (next) {
  this.totalSpent = this.expenses.reduce((sum, e) => sum + e.amount, 0);
  next();
});

export const Budget = mongoose.model<IBudget>('Budget', BudgetSchema);


// ── Housing (finances secretary registry) ──────────────────────────────────────
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
  payments: Array<{
    month: string;   // 'YYYY-MM'
    paid: boolean;
    paidOn?: Date;
    amount: number;
    receiptUrl?: string;
  }>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HousingSchema = new Schema<IHousing>(
  {
    country:        { type: String, required: true },
    address:        { type: String, required: true },
    landlordName:   { type: String, required: true },
    landlordPhone:  { type: String, required: true },
    landlordEmail:  { type: String },
    tenants:        [{ type: Schema.Types.ObjectId, ref: 'User' }],
    monthlyRent:    { type: Number, required: true },
    currency:       { type: String, default: 'USD' },
    leaseStart:     { type: Date, required: true },
    leaseEnd:       { type: Date, required: true },
    payments: [
      {
        month:      { type: String },
        paid:       { type: Boolean, default: false },
        paidOn:     { type: Date },
        amount:     { type: Number },
        receiptUrl: { type: String },
      },
    ],
    notes: { type: String },
  },
  { timestamps: true }
);
HousingSchema.index({ country: 1 });

export const Housing = mongoose.model<IHousing>('Housing', HousingSchema);


// ── Flight (immigration secretary / ONG covers cost) ──────────────────────────
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

const FlightSchema = new Schema<IFlight>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    country:     { type: String, required: true },
    flightType:  { type: String, enum: ['arrival', 'departure', 'internal'], required: true },
    origin:      { type: String, required: true },
    destination: { type: String, required: true },
    airline:     { type: String },
    flightNumber: { type: String },
    scheduledDate: { type: Date, required: true },
    actualDate:    { type: Date },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled',
    },
    cost:         { type: Number },
    currency:     { type: String, default: 'USD' },
    coveredByOng: { type: Boolean, default: true },
    bookingReference: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);
FlightSchema.index({ userId: 1 });
FlightSchema.index({ country: 1, status: 1 });

export const Flight = mongoose.model<IFlight>('Flight', FlightSchema);

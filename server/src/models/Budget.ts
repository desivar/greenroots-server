import mongoose, { Document, Schema } from 'mongoose';

export type ExpenseCategory = 'food' | 'transport' | 'phone' | 'personal' | 'work' | 'other';

export interface IExpense { description: string; amount: number; category: ExpenseCategory; date: Date; }

export interface IBudget extends Document {
  userId: mongoose.Types.ObjectId;
  month: string;
  allowance: number;
  expenses: IExpense[];
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>({
  description: { type: String, required: true },
  amount:      { type: Number, required: true },
  category:    { type: String, enum: ['food','transport','phone','personal','work','other'], default: 'other' },
  date:        { type: Date, default: Date.now },
}, { _id: false });

const BudgetSchema = new Schema<IBudget>({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  month:     { type: String, required: true },
  allowance: { type: Number, required: true },
  expenses:  { type: [ExpenseSchema], default: [] },
  totalSpent:{ type: Number, default: 0 },
}, { timestamps: true });

BudgetSchema.index({ userId: 1, month: 1 }, { unique: true });
BudgetSchema.pre('save', function(next) {
  this.totalSpent = this.expenses.reduce((s, e) => s + e.amount, 0);
  next();
});
export const Budget = mongoose.model<IBudget>('Budget', BudgetSchema);

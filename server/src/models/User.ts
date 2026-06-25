import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole =
  | 'member_m' | 'member_f' | 'women_trainer'
  | 'district_leader' | 'zone_leader' | 'assistant'
  | 'secretary_finances' | 'secretary_immigration'
  | 'secretary_materials' | 'secretary_technology'
  | 'ceo_wife' | 'ceo';

export type WorkType = 'volunteer' | 'normal';
export type MaritalStatus = 'single' | 'couple';
export type Country = 'USA' | 'Honduras' | 'Canada' | 'Spain' | 'England';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  gender: 'male' | 'female';
  dateOfBirth: Date;
  phone: string;
  maritalStatus: MaritalStatus;
  partner?: {
    firstName: string;
    lastName: string;
    gender: 'male' | 'female';
    dateOfBirth: Date;
  };
  role: UserRole;
  country: Country;
  originCountry: string;
  zone?: number;
  district?: number;
  team?: string;
  workType: WorkType;
  termMonths: number;
  startDate: Date;
  endDate: Date;
  languages: string[];
  education: { level: string; fieldOfStudy?: string; institution?: string };
  workExperience: string;
  skills: string[];
  otherSkills?: string;
  motivation: string;
  isApproved: boolean;
  isActive: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  profilePhoto?: string;
  lastRotationDate?: Date;
  rotationHistory: { zone: number; district: number; team: string; from: Date; to?: Date }[];
  comparePassword(candidate: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  firstName:     { type: String, required: true, trim: true },
  lastName:      { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:      { type: String, required: true, minlength: 8, select: false },
  gender:        { type: String, enum: ['male','female'], required: true },
  dateOfBirth:   { type: Date, required: true },
  phone:         { type: String, required: true },
  maritalStatus: { type: String, enum: ['single','couple'], default: 'single' },
  partner: {
    firstName: String, lastName: String,
    gender: { type: String, enum: ['male','female'] },
    dateOfBirth: Date,
  },
  role: {
    type: String,
    enum: ['member_m','member_f','women_trainer','district_leader','zone_leader',
           'assistant','secretary_finances','secretary_immigration',
           'secretary_materials','secretary_technology','ceo_wife','ceo'],
    default: 'member_m',
  },
  country:        { type: String, enum: ['USA','Honduras','Canada','Spain','England'], required: true },
  originCountry:  { type: String, required: true },
  zone:           { type: Number, min: 1, max: 5 },
  district:       { type: Number, min: 1, max: 4 },
  team:           { type: String },
  workType:       { type: String, enum: ['volunteer','normal'], required: true },
  termMonths:     { type: Number, enum: [6,9,12,18,24], required: true },
  startDate:      { type: Date, required: true },
  endDate:        { type: Date, required: true },
  languages:      [{ type: String }],
  education: {
    level: { type: String, required: true },
    fieldOfStudy: String,
    institution: String,
  },
  workExperience: { type: String, default: '' },
  skills:         [{ type: String }],
  otherSkills:    { type: String },
  motivation:     { type: String, required: true },
  isApproved:           { type: Boolean, default: false },
  isActive:             { type: Boolean, default: true },
  passwordResetToken:   { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  profilePhoto:         { type: String },
  lastRotationDate:     { type: Date },
  rotationHistory: [{
    zone: Number, district: Number, team: String,
    from: Date, to: Date,
  }],
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.pre('save', function (next) {
  if (this.isNew && (this.role as string) === 'member_m' && this.gender === 'female') {
    this.role = 'member_f';
  }
  next();
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);

import mongoose, { Document, Schema } from 'mongoose';

export interface ITeamScore {
  teamId: string;
  teamName: string;
  members: mongoose.Types.ObjectId[];
  points: number;
  gardensStarted: number;
  familiesTrained: number;
  followUpRate: number;
  month: string;
  year: number;
}

export interface IOrgUnit extends Document {
  country: string;
  zone: number;
  zoneName: string;
  zoneLeaders: mongoose.Types.ObjectId[];
  district: number;
  districtLeaders: mongoose.Types.ObjectId[];
  teams: ITeamScore[];
  zoneScore: number;
  districtScore: number;
  month: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

const TeamScoreSchema = new Schema<ITeamScore>({
  teamId:          { type: String, required: true },
  teamName:        { type: String, required: true },
  members:         [{ type: Schema.Types.ObjectId, ref: 'User' }],
  points:          { type: Number, default: 0 },
  gardensStarted:  { type: Number, default: 0 },
  familiesTrained: { type: Number, default: 0 },
  followUpRate:    { type: Number, default: 0 },
  month:           { type: String },
  year:            { type: Number },
}, { _id: false });

const OrgUnitSchema = new Schema<IOrgUnit>({
  country:         { type: String, required: true },
  zone:            { type: Number, required: true, min: 1, max: 5 },
  zoneName:        { type: String, required: true },
  zoneLeaders:     [{ type: Schema.Types.ObjectId, ref: 'User' }],
  district:        { type: Number, required: true, min: 1, max: 4 },
  districtLeaders: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  teams:           [TeamScoreSchema],
  zoneScore:       { type: Number, default: 0 },
  districtScore:   { type: Number, default: 0 },
  month:           { type: String, required: true },
  year:            { type: Number, required: true },
}, { timestamps: true });

export default mongoose.model<IOrgUnit>('OrgUnit', OrgUnitSchema);

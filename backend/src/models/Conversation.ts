import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  clientId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, required: true, enum: ['user', 'assistant'] },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

conversationSchema.index({ clientId: 1, createdAt: 1 });

export default mongoose.model<IConversation>('Conversation', conversationSchema);
import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  venue: { type: String, required: true },
  organizerAddress: { type: String, required: true },
  contractAddress: { type: String }, // Stored after on-chain creation
  ipfsMetadataURI: { type: String, required: true },
  imageUrl: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('Event', eventSchema);
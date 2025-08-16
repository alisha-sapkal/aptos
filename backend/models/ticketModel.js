import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  ticketObjectAddress: { type: String, required: true, unique: true },
  eventContractAddress: { type: String, required: true },
  ownerAddress: { type: String, required: true },
  qrToken: { type: String, required: true, unique: true },
  isCheckedIn: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Ticket', ticketSchema);
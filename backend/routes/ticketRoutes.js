import express from 'express';
import { generateQRToken, verifyTicket } from '../controllers/ticketController.js';

const router = express.Router();

router.post('/generate-qr', generateQRToken);
router.post('/verify', verifyTicket);

export default router;